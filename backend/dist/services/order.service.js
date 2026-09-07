"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.getAllOrders = getAllOrders;
exports.getOrderById = getOrderById;
exports.getDashboardStats = getDashboardStats;
exports.updateDeliveryStatus = updateDeliveryStatus;
const prisma_1 = __importDefault(require("../data-access/prisma"));
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
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
async function createOrder(input) {
    if (!input.items || input.items.length === 0) {
        throw new AppError_1.AppError('An order must contain at least one line item.', 400);
    }
    // Validate quantities are positive integers
    for (const item of input.items) {
        if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
            throw new AppError_1.AppError('Each line item must have a valid productId and a quantity greater than zero.', 400);
        }
    }
    // Deduplicate and aggregate quantities if same product passed multiple times
    const aggregatedItemsMap = new Map();
    for (const item of input.items) {
        const current = aggregatedItemsMap.get(item.productId) || 0;
        aggregatedItemsMap.set(item.productId, current + item.quantity);
    }
    // Sort product IDs deterministically to prevent database deadlocks
    const sortedProductIds = Array.from(aggregatedItemsMap.keys()).sort((a, b) => a - b);
    const initialStatus = input.status || client_1.OrderStatus.confirmed;
    return prisma_1.default.$transaction(async (tx) => {
        // 1. Verify customer exists
        const customer = await tx.customer.findUnique({
            where: { id: input.customerId },
        });
        if (!customer) {
            throw new AppError_1.AppError(`Customer with ID ${input.customerId} does not exist.`, 404);
        }
        // 2. Fetch and lock products using SELECT ... FOR UPDATE
        // This prevents race conditions where two simultaneous transactions could read the same
        // stock quantity and both commit, causing negative inventory.
        const lockedProducts = await tx.$queryRaw `
      SELECT id, name, sku, unit_price, quantity_in_stock
      FROM products
      WHERE id = ANY(${sortedProductIds}::int[])
      FOR UPDATE
    `;
        if (lockedProducts.length !== sortedProductIds.length) {
            const foundIds = new Set(lockedProducts.map((p) => p.id));
            const missing = sortedProductIds.filter((id) => !foundIds.has(id));
            throw new AppError_1.AppError(`Product(s) not found with ID(s): ${missing.join(', ')}`, 404);
        }
        const productMap = new Map(lockedProducts.map((p) => [p.id, p]));
        // 3. Validate stock availability for all line items before any mutations
        for (const [productId, requestedQty] of aggregatedItemsMap.entries()) {
            const product = productMap.get(productId);
            if (product.quantity_in_stock < requestedQty) {
                throw new AppError_1.AppError(`Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.quantity_in_stock}, Requested: ${requestedQty}. Order aborted and rolled back.`, 400);
            }
        }
        // 4. Create the Order header record
        const isDelivery = input.orderType === client_1.OrderType.item_delivery;
        const initialDeliveryStatus = isDelivery
            ? input.deliveryStatus || client_1.DeliveryStatus.pending
            : client_1.DeliveryStatus.not_applicable;
        const createdOrder = await tx.order.create({
            data: {
                customerId: input.customerId,
                status: initialStatus,
                orderType: input.orderType || client_1.OrderType.pos_checkout,
                deliveryStatus: initialDeliveryStatus,
                deliveryAddress: input.deliveryAddress?.trim() || null,
                deliveryNotes: input.deliveryNotes?.trim() || null,
                cashierId: input.cashierId || null,
            },
        });
        // 5. Deduct stock, insert stock movements, and create order items
        for (const [productId, requestedQty] of aggregatedItemsMap.entries()) {
            const product = productMap.get(productId);
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
                    reason: client_1.MovementReason.order,
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
async function updateOrderStatus(orderId, nextStatus) {
    return prisma_1.default.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
            },
        });
        if (!order) {
            throw new AppError_1.AppError(`Order with ID ${orderId} not found.`, 404);
        }
        if (order.status === nextStatus) {
            return order; // No-op
        }
        if (order.status === client_1.OrderStatus.cancelled) {
            throw new AppError_1.AppError('Cannot update status of an already cancelled order.', 400);
        }
        if (order.status === client_1.OrderStatus.shipped && nextStatus === client_1.OrderStatus.cancelled) {
            throw new AppError_1.AppError('Shipped orders cannot be cancelled.', 400);
        }
        // Validate transition rules
        const validTransitions = {
            [client_1.OrderStatus.draft]: [client_1.OrderStatus.confirmed, client_1.OrderStatus.cancelled],
            [client_1.OrderStatus.confirmed]: [client_1.OrderStatus.shipped, client_1.OrderStatus.cancelled],
            [client_1.OrderStatus.shipped]: [],
            [client_1.OrderStatus.cancelled]: [],
        };
        if (!validTransitions[order.status].includes(nextStatus)) {
            throw new AppError_1.AppError(`Invalid status transition from "${order.status}" to "${nextStatus}".`, 400);
        }
        // If transitioning to cancelled: reverse stock deduction
        if (nextStatus === client_1.OrderStatus.cancelled) {
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
                        reason: client_1.MovementReason.adjustment,
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
async function getAllOrders(status, orderType) {
    const where = {};
    if (status)
        where.status = status;
    if (orderType)
        where.orderType = orderType;
    return prisma_1.default.order.findMany({
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
async function getOrderById(id) {
    const order = await prisma_1.default.order.findUnique({
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
        throw new AppError_1.AppError(`Order with ID ${id} not found.`, 404);
    }
    return order;
}
async function getDashboardStats() {
    const [totalProducts, lowStockProducts, totalOrders, ordersThisMonth] = await Promise.all([
        prisma_1.default.product.count(),
        prisma_1.default.$queryRaw `
      SELECT COUNT(*)::bigint as count
      FROM products
      WHERE quantity_in_stock <= reorder_threshold
    `,
        prisma_1.default.order.count(),
        prisma_1.default.order.count({
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
async function updateDeliveryStatus(orderId, deliveryStatus) {
    const order = await prisma_1.default.order.findUnique({
        where: { id: orderId },
    });
    if (!order) {
        throw new AppError_1.AppError(`Order with ID ${orderId} not found.`, 404);
    }
    return prisma_1.default.order.update({
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
