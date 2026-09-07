import prisma from '../data-access/prisma';
import { MovementReason, OrderStatus, OrderType, DeliveryStatus, Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

export interface OrderLineItemInput {
  productId: number;
  quantity: number;
}

export interface CreateOrderInput {
  customerId: number;
  items: OrderLineItemInput[];
  status?: OrderStatus;
  orderType?: OrderType;
  deliveryStatus?: DeliveryStatus;
  deliveryAddress?: string;
  deliveryNotes?: string;
  cashierId?: number;
}

/**
 * Places an order using an atomic interactive Prisma $transaction.
 *
 * Concurrency & Atomicity Design:
 * 1. Product IDs are sorted deterministically before acquiring locks to prevent deadlocks
 *    under concurrent order submissions.
 * 2. In PostgreSQL, we lock each product row using SELECT ... FOR UPDATE within the transaction,
 *    ensuring isolated stock reads under concurrent load.
 * 3. Every line item is validated for sufficient stock. If any product is short, an AppError
 *    is thrown, which immediately causes Prisma to issue a ROLLBACK for the entire transaction.
 * 4. On successful validation, product stock is decremented, negative stock movements are logged
 *    with reason = 'order', and the order plus line items are persisted.
 */
export async function createOrder(input: CreateOrderInput) {
  if (!input.items || input.items.length === 0) {
    throw new AppError('An order must contain at least one line item.', 400);
  }

  // Validate quantities are positive integers
  for (const item of input.items) {
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new AppError('Each line item must have a valid productId and a quantity greater than zero.', 400);
    }
  }

  // Deduplicate and aggregate quantities if same product passed multiple times
  const aggregatedItemsMap = new Map<number, number>();
  for (const item of input.items) {
    const current = aggregatedItemsMap.get(item.productId) || 0;
    aggregatedItemsMap.set(item.productId, current + item.quantity);
  }

  // Sort product IDs deterministically to prevent database deadlocks
  const sortedProductIds = Array.from(aggregatedItemsMap.keys()).sort((a, b) => a - b);

  const initialStatus = input.status || OrderStatus.confirmed;

  return prisma.$transaction(async (tx) => {
    // 1. Verify customer exists
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) {
      throw new AppError(`Customer with ID ${input.customerId} does not exist.`, 404);
    }

    // 2. Fetch and lock products using SELECT ... FOR UPDATE
    // This prevents race conditions where two simultaneous transactions could read the same
    // stock quantity and both commit, causing negative inventory.
    const lockedProducts = await tx.$queryRaw<
      Array<{
        id: number;
        name: string;
        sku: string;
        unit_price: Prisma.Decimal;
        quantity_in_stock: number;
      }>
    >`
      SELECT id, name, sku, unit_price, quantity_in_stock
      FROM products
      WHERE id = ANY(${sortedProductIds}::int[])
      FOR UPDATE
    `;

    if (lockedProducts.length !== sortedProductIds.length) {
      const foundIds = new Set(lockedProducts.map((p) => p.id));
      const missing = sortedProductIds.filter((id) => !foundIds.has(id));
      throw new AppError(`Product(s) not found with ID(s): ${missing.join(', ')}`, 404);
    }

    const productMap = new Map(lockedProducts.map((p) => [p.id, p]));

    // 3. Validate stock availability for all line items before any mutations
    for (const [productId, requestedQty] of aggregatedItemsMap.entries()) {
      const product = productMap.get(productId)!;
      if (product.quantity_in_stock < requestedQty) {
        throw new AppError(
          `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.quantity_in_stock}, Requested: ${requestedQty}. Order aborted and rolled back.`,
          400
        );
      }
    }

    // 4. Create the Order header record
    const isDelivery = input.orderType === OrderType.item_delivery;
    const initialDeliveryStatus = isDelivery
      ? input.deliveryStatus || DeliveryStatus.pending
      : DeliveryStatus.not_applicable;

    const createdOrder = await tx.order.create({
      data: {
        customerId: input.customerId,
        status: initialStatus,
        orderType: input.orderType || OrderType.pos_checkout,
        deliveryStatus: initialDeliveryStatus,
        deliveryAddress: input.deliveryAddress?.trim() || null,
        deliveryNotes: input.deliveryNotes?.trim() || null,
        cashierId: input.cashierId || null,
      },
    });

    // 5. Deduct stock, insert stock movements, and create order items
    for (const [productId, requestedQty] of aggregatedItemsMap.entries()) {
      const product = productMap.get(productId)!;

      // Deduct quantity_in_stock
      await tx.product.update({
        where: { id: productId },
        data: {
          quantityInStock: { decrement: requestedQty },
        },
      });

      // Audit log stock movement
      await tx.stockMovement.create({
        data: {
          productId,
          changeQuantity: -requestedQty,
          reason: MovementReason.order,
        },
      });

      // Record Order Item with historical unit price at order time
      await tx.orderItem.create({
        data: {
          orderId: createdOrder.id,
          productId,
          quantity: requestedQty,
          unitPriceAtOrder: product.unit_price,
        },
      });
    }

    // 6. Return fully populated order
    return tx.order.findUniqueOrThrow({
      where: { id: createdOrder.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  });
}

/**
 * Updates an order status enforcing state machine constraints and stock reversal on cancellation.
 * State machine flow:
 *   draft -> confirmed
 *   confirmed -> shipped
 *   draft -> cancelled (reverses stock)
 *   confirmed -> cancelled (reverses stock)
 *
 * If cancelled, all items have their deducted stock restored and an adjustment stock movement logged.
 */
export async function updateOrderStatus(orderId: number, nextStatus: OrderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new AppError(`Order with ID ${orderId} not found.`, 404);
    }

    if (order.status === nextStatus) {
      return order; // No-op
    }

    if (order.status === OrderStatus.cancelled) {
      throw new AppError('Cannot update status of an already cancelled order.', 400);
    }

    if (order.status === OrderStatus.shipped && nextStatus === OrderStatus.cancelled) {
      throw new AppError('Shipped orders cannot be cancelled.', 400);
    }

    // Validate transition rules
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.draft]: [OrderStatus.confirmed, OrderStatus.cancelled],
      [OrderStatus.confirmed]: [OrderStatus.shipped, OrderStatus.cancelled],
      [OrderStatus.shipped]: [],
      [OrderStatus.cancelled]: [],
    };

    if (!validTransitions[order.status].includes(nextStatus)) {
      throw new AppError(
        `Invalid status transition from "${order.status}" to "${nextStatus}".`,
        400
      );
    }

    // If transitioning to cancelled: reverse stock deduction
    if (nextStatus === OrderStatus.cancelled) {
      for (const item of order.items) {
        // Restore stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantityInStock: { increment: item.quantity },
          },
        });

        // Log reversal movement (reason: adjustment)
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            changeQuantity: item.quantity,
            reason: MovementReason.adjustment,
          },
        });
      }
    }

    // Update status
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return updated;
  });
}

export async function getAllOrders(status?: OrderStatus, orderType?: OrderType) {
  const where: any = {};
  if (status) where.status = status;
  if (orderType) where.orderType = orderType;
  return prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getOrderById(id: number) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError(`Order with ID ${id} not found.`, 404);
  }

  return order;
}

export async function getDashboardStats() {
  const [totalProducts, lowStockProducts, totalOrders, ordersThisMonth] = await Promise.all([
    prisma.product.count(),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM products
      WHERE quantity_in_stock <= reorder_threshold
    `,
    prisma.order.count(),
    prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  return {
    totalProducts,
    lowStockCount: Number(lowStockProducts[0]?.count || 0),
    totalOrders,
    ordersThisMonth,
  };
}

export async function updateDeliveryStatus(orderId: number, deliveryStatus: DeliveryStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new AppError(`Order with ID ${orderId} not found.`, 404);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { deliveryStatus },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}
