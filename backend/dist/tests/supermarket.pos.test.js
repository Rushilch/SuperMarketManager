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
const customerService = __importStar(require("../services/customer.service"));
const productService = __importStar(require("../services/product.service"));
const orderService = __importStar(require("../services/order.service"));
const refillService = __importStar(require("../services/refill.service"));
const client_1 = require("@prisma/client");
(0, vitest_1.describe)('Supermarket POS & Delivery Integration Suite', () => {
    let testProduct;
    let testCustomer;
    (0, vitest_1.beforeAll)(async () => {
        // Find or create test product with barcode
        testProduct = await prisma_1.default.product.findFirst({
            where: { barcode: '8901030010015' },
        });
        if (!testProduct) {
            testProduct = await prisma_1.default.product.create({
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
        testCustomer = await prisma_1.default.customer.findFirst({
            where: { phone: '+1 555-0199' },
        });
        if (!testCustomer) {
            testCustomer = await prisma_1.default.customer.create({
                data: {
                    name: 'Marcus Vance',
                    phone: '+1 555-0199',
                    address: '100 Industrial Parkway, Chicago, IL',
                },
            });
        }
    });
    (0, vitest_1.it)('1. Fetches product by barcode accurately', async () => {
        const found = await productService.getProductByBarcode('8901030010015');
        (0, vitest_1.expect)(found).toBeDefined();
        (0, vitest_1.expect)(found.id).toBe(testProduct.id);
        (0, vitest_1.expect)(found.barcode).toBe('8901030010015');
    });
    (0, vitest_1.it)('2. Looks up existing customer by mobile number', async () => {
        const found = await customerService.getCustomerByPhone('+1 555-0199');
        (0, vitest_1.expect)(found).toBeDefined();
        (0, vitest_1.expect)(found?.name).toBe('Marcus Vance');
        (0, vitest_1.expect)(found?.phone).toBe('+1 555-0199');
    });
    (0, vitest_1.it)('3. Returns null for non-existent mobile number and registers new customer on the fly', async () => {
        const randomPhone = `+1 555-${Math.floor(1000 + Math.random() * 9000)}`;
        const notFound = await customerService.getCustomerByPhone(randomPhone);
        (0, vitest_1.expect)(notFound).toBeNull();
        // Register customer with just name, phone, and optional address
        const newCustomer = await customerService.createCustomer({
            name: 'Walk-in Shopper',
            phone: randomPhone,
            address: '77 Market St',
        });
        (0, vitest_1.expect)(newCustomer.id).toBeDefined();
        (0, vitest_1.expect)(newCustomer.phone).toBe(randomPhone);
        (0, vitest_1.expect)(newCustomer.loyaltyPoints).toBeGreaterThanOrEqual(10);
    });
    (0, vitest_1.it)('4. Creates an In-Store POS checkout order and atomically deducts stock', async () => {
        const stockBefore = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProduct.id } })).quantityInStock;
        const order = await orderService.createOrder({
            customerId: testCustomer.id,
            orderType: client_1.OrderType.pos_checkout,
            items: [{ productId: testProduct.id, quantity: 2 }],
        });
        (0, vitest_1.expect)(order.id).toBeDefined();
        (0, vitest_1.expect)(order.orderType).toBe(client_1.OrderType.pos_checkout);
        (0, vitest_1.expect)(order.deliveryStatus).toBe(client_1.DeliveryStatus.not_applicable);
        const stockAfter = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProduct.id } })).quantityInStock;
        (0, vitest_1.expect)(stockAfter).toBe(stockBefore - 2);
    });
    (0, vitest_1.it)('5. Creates an Item Delivery order and updates delivery status', async () => {
        const deliveryOrder = await orderService.createOrder({
            customerId: testCustomer.id,
            orderType: client_1.OrderType.item_delivery,
            deliveryAddress: '42 Wallaby Way, Sydney',
            deliveryNotes: 'Ring bell on arrival',
            items: [{ productId: testProduct.id, quantity: 1 }],
        });
        (0, vitest_1.expect)(deliveryOrder.orderType).toBe(client_1.OrderType.item_delivery);
        (0, vitest_1.expect)(deliveryOrder.deliveryStatus).toBe(client_1.DeliveryStatus.pending);
        (0, vitest_1.expect)(deliveryOrder.deliveryAddress).toBe('42 Wallaby Way, Sydney');
        // Update to out_for_delivery
        const dispatched = await orderService.updateDeliveryStatus(deliveryOrder.id, client_1.DeliveryStatus.out_for_delivery);
        (0, vitest_1.expect)(dispatched.deliveryStatus).toBe(client_1.DeliveryStatus.out_for_delivery);
        // Update to delivered
        const delivered = await orderService.updateDeliveryStatus(deliveryOrder.id, client_1.DeliveryStatus.delivered);
        (0, vitest_1.expect)(delivered.deliveryStatus).toBe(client_1.DeliveryStatus.delivered);
    });
    (0, vitest_1.it)('6. Records an Inbound Stock Refill delivery, increments stock, and writes audit movements', async () => {
        const stockBefore = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProduct.id } })).quantityInStock;
        const refill = await refillService.createRefill({
            supplierName: 'Dairy Express Supply Co.',
            referenceNo: `REFILL-TEST-${Date.now()}`,
            notes: 'Weekly fresh batch replenishment',
            receivedBy: 'Cashier Counter 1',
            items: [{ productId: testProduct.id, quantity: 30, costPrice: 2.75 }],
        });
        (0, vitest_1.expect)(refill.id).toBeDefined();
        (0, vitest_1.expect)(refill.totalItems).toBe(30);
        const stockAfter = (await prisma_1.default.product.findUniqueOrThrow({ where: { id: testProduct.id } })).quantityInStock;
        (0, vitest_1.expect)(stockAfter).toBe(stockBefore + 30);
        // Verify stock movement was recorded
        const latestMovement = await prisma_1.default.stockMovement.findFirst({
            where: { productId: testProduct.id, reason: client_1.MovementReason.restock },
            orderBy: { createdAt: 'desc' },
        });
        (0, vitest_1.expect)(latestMovement).toBeDefined();
        (0, vitest_1.expect)(latestMovement?.changeQuantity).toBe(30);
    });
});
