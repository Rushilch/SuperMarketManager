import { api } from './client';
import { Order, OrderStatus, OrderType, DeliveryStatus, DashboardStats } from '../types';

export async function getOrdersApi(status?: OrderStatus): Promise<Order[]> {
  const res = await api.get('/orders', { params: status ? { status } : {} });
  return res.data.data;
}

export async function getOrderByIdApi(id: number): Promise<Order> {
  const res = await api.get(`/orders/${id}`);
  return res.data.data;
}

export async function createOrderApi(data: {
  customerId: number;
  status?: OrderStatus;
  orderType?: OrderType;
  deliveryStatus?: DeliveryStatus;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  cashierId?: number | null;
  items: Array<{ productId: number; quantity: number }>;
}): Promise<Order> {
  const res = await api.post('/orders', data);
  return res.data.data;
}

export async function updateOrderStatusApi(id: number, status: OrderStatus): Promise<Order> {
  const res = await api.patch(`/orders/${id}/status`, { status });
  return res.data.data;
}

export async function updateDeliveryStatusApi(
  id: number,
  deliveryStatus: DeliveryStatus
): Promise<Order> {
  const res = await api.patch(`/orders/${id}/delivery-status`, { deliveryStatus });
  return res.data.data;
}

export async function getDashboardStatsApi(): Promise<DashboardStats> {
  const res = await api.get('/dashboard/stats');
  return res.data.data;
}
