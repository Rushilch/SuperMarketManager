import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import createApp from '../app';
import { Server } from 'http';
import prisma from '../data-access/prisma';

let server: Server;
let baseUrl: string;
let adminToken: string;
let staffToken: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = createApp.listen(0, () => {
      const port = (server.address() as any).port;
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

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});

describe('API Integration Endpoints', () => {
  it('Authentication: Admin & Staff can log in and retrieve tokens', () => {
    expect(adminToken).toBeDefined();
    expect(staffToken).toBeDefined();
  });

  it('RBAC: Only Admin can register new users (Staff gets 403)', async () => {
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
    expect(forbiddenRes.status).toBe(403);

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
    expect(allowedRes.status).toBe(201);
  });

  it('Products: GET /products and GET /products/low-stock return data', async () => {
    const listRes = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const listData = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listData.data)).toBe(true);
    expect(listData.data.length).toBeGreaterThan(0);

    const lowStockRes = await fetch(`${baseUrl}/products/low-stock`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const lowStockData = await lowStockRes.json();
    expect(lowStockRes.status).toBe(200);
    expect(Array.isArray(lowStockData.data)).toBe(true);
    // Every low stock item must have quantityInStock <= reorderThreshold
    for (const item of lowStockData.data) {
      expect(item.quantityInStock).toBeLessThanOrEqual(item.reorderThreshold);
    }
  });

  it('Customers: GET and POST /customers', async () => {
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
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.data.id).toBeDefined();

    const getRes = await fetch(`${baseUrl}/customers`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.data.some((c: any) => c.id === created.data.id)).toBe(true);
  });

  it('Orders: POST /orders creates order and PATCH /orders/:id/status updates status', async () => {
    // 1. Get a product and customer
    const prodsRes = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const prods = (await prodsRes.json()).data;
    const availableProd = prods.find((p: any) => p.quantityInStock >= 5);

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
    expect(orderRes.status).toBe(201);
    const order = (await orderRes.json()).data;
    expect(order.status).toBe('confirmed');

    // 3. Update status to shipped
    const statusRes = await fetch(`${baseUrl}/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ status: 'shipped' }),
    });
    expect(statusRes.status).toBe(200);
    const updated = (await statusRes.json()).data;
    expect(updated.status).toBe('shipped');
  });

  it('Dashboard: GET /dashboard/stats returns aggregate metrics', async () => {
    const statsRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(statsRes.status).toBe(200);
    const data = (await statsRes.json()).data;
    expect(data.totalProducts).toBeGreaterThan(0);
    expect(typeof data.lowStockCount).toBe('number');
    expect(typeof data.totalOrders).toBe('number');
  });
});
