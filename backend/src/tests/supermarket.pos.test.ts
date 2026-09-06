import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../data-access/prisma';
import * as customerService from '../services/customer.service';
import * as productService from '../services/product.service';
import * as orderService from '../services/order.service';
import * as refillService from '../services/refill.service';
import { OrderType, DeliveryStatus, MovementReason } from '@prisma/client';

describe('Supermarket POS & Delivery Integration Suite', () => {
  let testProduct: any;
  let testCustomer: any;

  beforeAll(async () => {
    // Find or create test product with barcode
    testProduct = await prisma.product.findFirst({
      where: { barcode: '8901030010015' },
    });

    if (!testProduct) {
      testProduct = await prisma.product.create({
        data: {
          name: 'Test Milk Gallon',
          sku: 'TEST-MILK-999',
          barcode: '8901030010015',
          category: 'Dairy',
          unitPrice: 4.50,
          quantityInStock: 20,
          reorderThreshold: 5,
        },
      });
    }

    // Find or create customer with phone
    testCustomer = await prisma.customer.findFirst({
      where: { phone: '+1 555-0199' },
    });

    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          name: 'Marcus Vance',
          phone: '+1 555-0199',
          address: '100 Industrial Parkway, Chicago, IL',
        },
      });
    }
  });

  it('1. Fetches product by barcode accurately', async () => {
    const found = await productService.getProductByBarcode('8901030010015');
    expect(found).toBeDefined();
    expect(found.id).toBe(testProduct.id);
    expect(found.barcode).toBe('8901030010015');
  });

  it('2. Looks up existing customer by mobile number', async () => {
    const found = await customerService.getCustomerByPhone('+1 555-0199');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Marcus Vance');
    expect(found?.phone).toBe('+1 555-0199');
  });

  it('3. Returns null for non-existent mobile number and registers new customer on the fly', async () => {
    const randomPhone = `+1 555-${Math.floor(1000 + Math.random() * 9000)}`;
    const notFound = await customerService.getCustomerByPhone(randomPhone);
    expect(notFound).toBeNull();

    // Register customer with just name, phone, and optional address
    const newCustomer = await customerService.createCustomer({
      name: 'Walk-in Shopper',
      phone: randomPhone,
      address: '77 Market St',
    });

    expect(newCustomer.id).toBeDefined();
    expect(newCustomer.phone).toBe(randomPhone);
    expect(newCustomer.loyaltyPoints).toBeGreaterThanOrEqual(10);
  });

  it('4. Creates an In-Store POS checkout order and atomically deducts stock', async () => {
    const stockBefore = (await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } })).quantityInStock;

    const order = await orderService.createOrder({
      customerId: testCustomer.id,
      orderType: OrderType.pos_checkout,
      items: [{ productId: testProduct.id, quantity: 2 }],
    });

    expect(order.id).toBeDefined();
    expect(order.orderType).toBe(OrderType.pos_checkout);
    expect(order.deliveryStatus).toBe(DeliveryStatus.not_applicable);

    const stockAfter = (await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } })).quantityInStock;
    expect(stockAfter).toBe(stockBefore - 2);
  });

  it('5. Creates an Item Delivery order and updates delivery status', async () => {
    const deliveryOrder = await orderService.createOrder({
      customerId: testCustomer.id,
      orderType: OrderType.item_delivery,
      deliveryAddress: '42 Wallaby Way, Sydney',
      deliveryNotes: 'Ring bell on arrival',
      items: [{ productId: testProduct.id, quantity: 1 }],
    });

    expect(deliveryOrder.orderType).toBe(OrderType.item_delivery);
    expect(deliveryOrder.deliveryStatus).toBe(DeliveryStatus.pending);
    expect(deliveryOrder.deliveryAddress).toBe('42 Wallaby Way, Sydney');

    // Update to out_for_delivery
    const dispatched = await orderService.updateDeliveryStatus(deliveryOrder.id, DeliveryStatus.out_for_delivery);
    expect(dispatched.deliveryStatus).toBe(DeliveryStatus.out_for_delivery);

    // Update to delivered
    const delivered = await orderService.updateDeliveryStatus(deliveryOrder.id, DeliveryStatus.delivered);
    expect(delivered.deliveryStatus).toBe(DeliveryStatus.delivered);
  });

  it('6. Records an Inbound Stock Refill delivery, increments stock, and writes audit movements', async () => {
    const stockBefore = (await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } })).quantityInStock;

    const refill = await refillService.createRefill({
      supplierName: 'Dairy Express Supply Co.',
      referenceNo: `REFILL-TEST-${Date.now()}`,
      notes: 'Weekly fresh batch replenishment',
      receivedBy: 'Cashier Counter 1',
      items: [{ productId: testProduct.id, quantity: 30, costPrice: 2.75 }],
    });

    expect(refill.id).toBeDefined();
    expect(refill.totalItems).toBe(30);

    const stockAfter = (await prisma.product.findUniqueOrThrow({ where: { id: testProduct.id } })).quantityInStock;
    expect(stockAfter).toBe(stockBefore + 30);

    // Verify stock movement was recorded
    const latestMovement = await prisma.stockMovement.findFirst({
      where: { productId: testProduct.id, reason: MovementReason.restock },
      orderBy: { createdAt: 'desc' },
    });

    expect(latestMovement).toBeDefined();
    expect(latestMovement?.changeQuantity).toBe(30);
  });
});
