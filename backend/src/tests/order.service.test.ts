import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../data-access/prisma';
import * as orderService from '../services/order.service';
import * as productService from '../services/product.service';
import { OrderStatus, MovementReason } from '@prisma/client';
import { AppError } from '../utils/AppError';

describe('Inventory & Order Transaction Logic', () => {
  let testCustomer: any;
  let testProductA: any;
  let testProductB: any;

  beforeAll(async () => {
    // Create dedicated test customer
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Unit Test Customer',
        email: `test_customer_${Date.now()}@example.com`,
        phone: '123-456-7890',
        address: '123 Test Lane',
      },
    });

    // Create test products with known initial quantities
    testProductA = await prisma.product.create({
      data: {
        name: 'Test Product Alpha',
        sku: `SKU-ALPHA-${Date.now()}`,
        unitPrice: 50.0,
        quantityInStock: 20,
        reorderThreshold: 5,
      },
    });

    testProductB = await prisma.product.create({
      data: {
        name: 'Test Product Beta',
        sku: `SKU-BETA-${Date.now()}`,
        unitPrice: 100.0,
        quantityInStock: 5,
        reorderThreshold: 2,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.stockMovement.deleteMany({
      where: { productId: { in: [testProductA.id, testProductB.id] } },
    });
    await prisma.orderItem.deleteMany({
      where: { productId: { in: [testProductA.id, testProductB.id] } },
    });
    await prisma.order.deleteMany({
      where: { customerId: testCustomer.id },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [testProductA.id, testProductB.id] } },
    });
    await prisma.customer.deleteMany({
      where: { id: testCustomer.id },
    });
    await prisma.$disconnect();
  });

  it('1. Successfully places a multi-item order, deducts stock, and logs stock movements atomically', async () => {
    const order = await orderService.createOrder({
      customerId: testCustomer.id,
      items: [
        { productId: testProductA.id, quantity: 3 },
        { productId: testProductB.id, quantity: 2 },
      ],
    });

    expect(order).toBeDefined();
    expect(order.customerId).toBe(testCustomer.id);
    expect(order.items.length).toBe(2);

    // Verify stock was deducted
    const updatedA = await prisma.product.findUniqueOrThrow({ where: { id: testProductA.id } });
    const updatedB = await prisma.product.findUniqueOrThrow({ where: { id: testProductB.id } });

    expect(updatedA.quantityInStock).toBe(17); // 20 - 3
    expect(updatedB.quantityInStock).toBe(3);  // 5 - 2

    // Verify stock movements were logged with reason "order"
    const movements = await prisma.stockMovement.findMany({
      where: {
        productId: { in: [testProductA.id, testProductB.id] },
        reason: MovementReason.order,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(movements.some((m) => m.productId === testProductA.id && m.changeQuantity === -3)).toBe(true);
    expect(movements.some((m) => m.productId === testProductB.id && m.changeQuantity === -2)).toBe(true);
  });

  it('2. Rolls back entire transaction when one item has insufficient stock (No partial deduction)', async () => {
    const stockBeforeA = (await prisma.product.findUniqueOrThrow({ where: { id: testProductA.id } })).quantityInStock;
    const stockBeforeB = (await prisma.product.findUniqueOrThrow({ where: { id: testProductB.id } })).quantityInStock;

    // testProductB currently has 3 in stock. We request 10 of Product B and 2 of Product A.
    await expect(
      orderService.createOrder({
        customerId: testCustomer.id,
        items: [
          { productId: testProductA.id, quantity: 2 },
          { productId: testProductB.id, quantity: 10 }, // Fails!
        ],
      })
    ).rejects.toThrow(AppError);

    // Stock for Product A MUST NOT have changed (transaction rollback guarantee)
    const stockAfterA = (await prisma.product.findUniqueOrThrow({ where: { id: testProductA.id } })).quantityInStock;
    const stockAfterB = (await prisma.product.findUniqueOrThrow({ where: { id: testProductB.id } })).quantityInStock;

    expect(stockAfterA).toBe(stockBeforeA);
    expect(stockAfterB).toBe(stockBeforeB);
  });

  it('3. Successfully cancels an order and restores deducted stock with adjustment movements', async () => {
    // Create an order to be cancelled
    const order = await orderService.createOrder({
      customerId: testCustomer.id,
      items: [{ productId: testProductA.id, quantity: 5 }],
      status: OrderStatus.confirmed,
    });

    const stockAfterOrder = (await prisma.product.findUniqueOrThrow({ where: { id: testProductA.id } })).quantityInStock;

    // Now cancel the order
    const cancelledOrder = await orderService.updateOrderStatus(order.id, OrderStatus.cancelled);
    expect(cancelledOrder.status).toBe(OrderStatus.cancelled);

    // Stock must be restored (+5)
    const stockAfterCancel = (await prisma.product.findUniqueOrThrow({ where: { id: testProductA.id } })).quantityInStock;
    expect(stockAfterCancel).toBe(stockAfterOrder + 5);

    // Reversal stock movement must be recorded with reason "adjustment"
    const reversalMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: testProductA.id,
        reason: MovementReason.adjustment,
        changeQuantity: 5,
      },
    });
    expect(reversalMovement).toBeDefined();
  });

  it('4. Rejects cancelling an order that has already been shipped', async () => {
    // Create and ship an order
    const order = await orderService.createOrder({
      customerId: testCustomer.id,
      items: [{ productId: testProductA.id, quantity: 1 }],
      status: OrderStatus.confirmed,
    });

    await orderService.updateOrderStatus(order.id, OrderStatus.shipped);

    // Attempting to cancel must throw error
    await expect(
      orderService.updateOrderStatus(order.id, OrderStatus.cancelled)
    ).rejects.toThrow('Shipped orders cannot be cancelled.');
  });

  it('5. Manual restock increases quantity and logs "restock" stock movement', async () => {
    const stockBefore = (await prisma.product.findUniqueOrThrow({ where: { id: testProductB.id } })).quantityInStock;

    await productService.restockProduct(testProductB.id, 15);

    const stockAfter = (await prisma.product.findUniqueOrThrow({ where: { id: testProductB.id } })).quantityInStock;
    expect(stockAfter).toBe(stockBefore + 15);

    const restockMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: testProductB.id,
        reason: MovementReason.restock,
        changeQuantity: 15,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(restockMovement).toBeDefined();
  });
});
