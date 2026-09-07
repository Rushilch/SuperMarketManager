"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = __importDefault(require("../data-access/prisma"));
const orderService = __importStar(require("../services/order.service"));
const productService = __importStar(require("../services/product.service"));
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
(0, vitest_1.describe)('Inventory & Order Transaction Logic', () => {
    let testCustomer;
    let testProductA;
    let testProductB;
    (0, vitest_1.beforeAll)(async () => {
        // Create dedicated test customer
        testCustomer = await prisma_1.default.customer.create({
            data: {
                name: 'Unit Test Customer',
                email: `test_customer_${Date.now()}@example.com`,
                phone: '123-456-7890',
                address: '123 Test Lane',
            },
        });
        // Create test products with known initial quantities
        testProductA = await prisma_1.default.product.create({
            data: {
                name: 'Test Product Alpha',
                sku: `SKU-ALPHA-${Date.now()}`,
                unitPrice: 50.0,
                quantityInStock: 20,
                reorderThreshold: 5,
            },
        });
        testProductB = await prisma_1.default.product.create({
            data: {
                name: 'Test Product Beta',
                sku: `SKU-BETA-${Date.now()}`,
                unitPrice: 100.0,
                quantityInStock: 5,
                reorderThreshold: 2,
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        // Cleanup created test records
        await prisma_1.default.stockMovement.deleteMany({
            where: { productId: { in: [testProductA.id, testProductB.id] } },
        });
        await prisma_1.default.orderItem.deleteMany({
            where: { productId: { in: [testProductA.id, testProductB.id] } },
        });
        await prisma_1.default.order.deleteMany({
            where: { customerId: testCustomer.id },
        });
        await prisma_1.default.product.deleteMany({
            where: { id: { in: [testProductA.id, testProductB.id] } },
        });
        await prisma_1.default.customer.deleteMany({
            where: { id: testCustomer.id },
        });
        await prisma_1.default.$disconnect();
    });
    (0, vitest_1.it)('1. Successfully places a multi-item order, deducts stock, and logs stock movements atomically', async () => {
        const order = await orderService.createOrder({
            customerId: testCustomer.id,
            items: [
                { productId: testProductA.id, quantity: 3 },
                { productId: testProductB.id, quantity: 2 },
            ],
        });
        (0, vitest_1.expect)(order).toBeDefined();
        (0, vitest_1.expect)(order.customerId).toBe(testCustomer.id);
        (0, vitest_1.expect)(order.items.length).toBe(2);
        // Verify stock was deducted
        const updatedA = await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductA.id } });
        const updatedB = await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductB.id } });
        (0, vitest_1.expect)(updatedA.quantityInStock).toBe(17); // 20 - 3
        (0, vitest_1.expect)(updatedB.quantityInStock).toBe(3); // 5 - 2
        // Verify stock movements were logged with reason "order"
        const movements = await prisma_1.default.stockMovement.findMany({
            where: {
                productId: { in: [testProductA.id, testProductB.id] },
                reason: client_1.MovementReason.order,
            },
            orderBy: { createdAt: 'desc' },
        });
        (0, vitest_1.expect)(movements.some((m) => m.productId === testProductA.id && m.changeQuantity === -3)).toBe(true);
        (0, vitest_1.expect)(movements.some((m) => m.productId === testProductB.id && m.changeQuantity === -2)).toBe(true);
    });
    (0, vitest_1.it)('2. Rolls back entire transaction when one item has insufficient stock (No partial deduction)', async () => {
        const stockBeforeA = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductA.id } })).quantityInStock;
        const stockBeforeB = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductB.id } })).quantityInStock;
        // testProductB currently has 3 in stock. We request 10 of Product B and 2 of Product A.
        await (0, vitest_1.expect)(orderService.createOrder({
            customerId: testCustomer.id,
            items: [
                { productId: testProductA.id, quantity: 2 },
                { productId: testProductB.id, quantity: 10 }, // Fails!
            ],
        })).rejects.toThrow(AppError_1.AppError);
        // Stock for Product A MUST NOT have changed (transaction rollback guarantee)
        const stockAfterA = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductA.id } })).quantityInStock;
        const stockAfterB = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductB.id } })).quantityInStock;
        (0, vitest_1.expect)(stockAfterA).toBe(stockBeforeA);
        (0, vitest_1.expect)(stockAfterB).toBe(stockBeforeB);
    });
    (0, vitest_1.it)('3. Successfully cancels an order and restores deducted stock with adjustment movements', async () => {
        // Create an order to be cancelled
        const order = await orderService.createOrder({
            customerId: testCustomer.id,
            items: [{ productId: testProductA.id, quantity: 5 }],
            status: client_1.OrderStatus.confirmed,
        });
        const stockAfterOrder = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductA.id } })).quantityInStock;
        // Now cancel the order
        const cancelledOrder = await orderService.updateOrderStatus(order.id, client_1.OrderStatus.cancelled);
        (0, vitest_1.expect)(cancelledOrder.status).toBe(client_1.OrderStatus.cancelled);
        // Stock must be restored (+5)
        const stockAfterCancel = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductA.id } })).quantityInStock;
        (0, vitest_1.expect)(stockAfterCancel).toBe(stockAfterOrder + 5);
        // Reversal stock movement must be recorded with reason "adjustment"
        const reversalMovement = await prisma_1.default.stockMovement.findFirst({
            where: {
                productId: testProductA.id,
                reason: client_1.MovementReason.adjustment,
                changeQuantity: 5,
            },
        });
        (0, vitest_1.expect)(reversalMovement).toBeDefined();
    });
    (0, vitest_1.it)('4. Rejects cancelling an order that has already been shipped', async () => {
        // Create and ship an order
        const order = await orderService.createOrder({
            customerId: testCustomer.id,
            items: [{ productId: testProductA.id, quantity: 1 }],
            status: client_1.OrderStatus.confirmed,
        });
        await orderService.updateOrderStatus(order.id, client_1.OrderStatus.shipped);
        // Attempting to cancel must throw error
        await (0, vitest_1.expect)(orderService.updateOrderStatus(order.id, client_1.OrderStatus.cancelled)).rejects.toThrow('Shipped orders cannot be cancelled.');
    });
    (0, vitest_1.it)('5. Manual restock increases quantity and logs "restock" stock movement', async () => {
        const stockBefore = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductB.id } })).quantityInStock;
        await productService.restockProduct(testProductB.id, 15);
        const stockAfter = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProductB.id } })).quantityInStock;
        (0, vitest_1.expect)(stockAfter).toBe(stockBefore + 15);
        const restockMovement = await prisma_1.default.stockMovement.findFirst({
            where: {
                productId: testProductB.id,
                reason: client_1.MovementReason.restock,
                changeQuantity: 15,
            },
            orderBy: { createdAt: 'desc' },
        });
        (0, vitest_1.expect)(restockMovement).toBeDefined();
    });
});
