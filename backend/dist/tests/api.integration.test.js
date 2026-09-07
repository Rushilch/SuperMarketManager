"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const app_1 = __importDefault(require("../app"));
const prisma_1 = __importDefault(require("../data-access/prisma"));
let server;
let baseUrl;
let adminToken;
let staffToken;
(0, vitest_1.beforeAll)(async () => {
    await new Promise((resolve) => {
        server = app_1.default.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://localhost:${port}/api`;
            resolve();
        });
    });
    // Log in as Admin
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@inventory.com', password: 'AdminPassword123!' }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;
    // Log in as Staff
    const staffRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'staff@inventory.com', password: 'StaffPassword123!' }),
    });
    const staffData = await staffRes.json();
    staffToken = staffData.data.token;
});
(0, vitest_1.afterAll)(async () => {
    await new Promise((resolve) => server.close(() => resolve()));
    await prisma_1.default.$disconnect();
});
(0, vitest_1.describe)('API Integration Endpoints', () => {
    (0, vitest_1.it)('Authentication: Admin & Staff can log in and retrieve tokens', () => {
        (0, vitest_1.expect)(adminToken).toBeDefined();
        (0, vitest_1.expect)(staffToken).toBeDefined();
    });
    (0, vitest_1.it)('RBAC: Only Admin can register new users (Staff gets 403)', async () => {
        // Staff attempt
        const forbiddenRes = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${staffToken}`,
            },
            body: JSON.stringify({
                name: 'New Worker',
                email: `worker_${Date.now()}@inventory.com`,
                password: 'Password123!',
                role: 'staff',
            }),
        });
        (0, vitest_1.expect)(forbiddenRes.status).toBe(403);
        // Admin attempt
        const allowedRes = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                name: 'Authorized Worker',
                email: `worker_${Date.now()}@inventory.com`,
                password: 'Password123!',
                role: 'staff',
            }),
        });
        (0, vitest_1.expect)(allowedRes.status).toBe(201);
    });
    (0, vitest_1.it)('Products: GET /products and GET /products/low-stock return data', async () => {
        const listRes = await fetch(`${baseUrl}/products`, {
            headers: { Authorization: `Bearer ${staffToken}` },
        });
        const listData = await listRes.json();
        (0, vitest_1.expect)(listRes.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(listData.data)).toBe(true);
        (0, vitest_1.expect)(listData.data.length).toBeGreaterThan(0);
        const lowStockRes = await fetch(`${baseUrl}/products/low-stock`, {
            headers: { Authorization: `Bearer ${staffToken}` },
        });
        const lowStockData = await lowStockRes.json();
        (0, vitest_1.expect)(lowStockRes.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(lowStockData.data)).toBe(true);
        // Every low stock item must have quantityInStock <= reorderThreshold
        for (const item of lowStockData.data) {
            (0, vitest_1.expect)(item.quantityInStock).toBeLessThanOrEqual(item.reorderThreshold);
        }
    });
    (0, vitest_1.it)('Customers: GET and POST /customers', async () => {
        const createRes = await fetch(`${baseUrl}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${staffToken}`,
            },
            body: JSON.stringify({
                name: 'API Test Customer',
                email: `customer_${Date.now()}@acme.com`,
                phone: `+1 555-${Date.now().toString().slice(-4)}`,
                address: '777 Market St',
            }),
        });
        (0, vitest_1.expect)(createRes.status).toBe(201);
        const created = await createRes.json();
        (0, vitest_1.expect)(created.data.id).toBeDefined();
        const getRes = await fetch(`${baseUrl}/customers`, {
            headers: { Authorization: `Bearer ${staffToken}` },
        });
        const getData = await getRes.json();
        (0, vitest_1.expect)(getRes.status).toBe(200);
        (0, vitest_1.expect)(getData.data.some((c) => c.id === created.data.id)).toBe(true);
    });
    (0, vitest_1.it)('Orders: POST /orders creates order and PATCH /orders/:id/status updates status', async () => {
        // 1. Get a product and customer
        const prodsRes = await fetch(`${baseUrl}/products`, {
            headers: { Authorization: `Bearer ${staffToken}` },
        });
        const prods = (await prodsRes.json()).data;
        const availableProd = prods.find((p) => p.quantityInStock >= 5);
        const custRes = await fetch(`${baseUrl}/customers`, {
            headers: { Authorization: `Bearer ${staffToken}` },
        });
        const custs = (await custRes.json()).data;
        const cust = custs[0];
        // 2. Place order
        const orderRes = await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${staffToken}`,
            },
            body: JSON.stringify({
                customerId: cust.id,
                items: [{ productId: availableProd.id, quantity: 2 }],
            }),
        });
        (0, vitest_1.expect)(orderRes.status).toBe(201);
        const order = (await orderRes.json()).data;
        (0, vitest_1.expect)(order.status).toBe('confirmed');
        // 3. Update status to shipped
        const statusRes = await fetch(`${baseUrl}/orders/${order.id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${staffToken}`,
            },
            body: JSON.stringify({ status: 'shipped' }),
        });
        (0, vitest_1.expect)(statusRes.status).toBe(200);
        const updated = (await statusRes.json()).data;
        (0, vitest_1.expect)(updated.status).toBe('shipped');
    });
    (0, vitest_1.it)('Dashboard: GET /dashboard/stats returns aggregate metrics', async () => {
        const statsRes = await fetch(`${baseUrl}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${staffToken}` },
        });
        (0, vitest_1.expect)(statsRes.status).toBe(200);
        const data = (await statsRes.json()).data;
        (0, vitest_1.expect)(data.totalProducts).toBeGreaterThan(0);
        (0, vitest_1.expect)(typeof data.lowStockCount).toBe('number');
        (0, vitest_1.expect)(typeof data.totalOrders).toBe('number');
    });
});
