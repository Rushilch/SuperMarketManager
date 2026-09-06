import { api } from './client';
import { StockRefill } from '../types';

export async function getRefillsApi(): Promise<StockRefill[]> {
  const res = await api.get('/refills');
  return res.data.data;
}

export async function getRefillByIdApi(id: number): Promise<StockRefill> {
  const res = await api.get(`/refills/${id}`);
  return res.data.data;
}

export async function createRefillApi(data: {
  supplierName: string;
  referenceNo?: string;
  notes?: string;
  receivedBy?: string;
  items: Array<{ productId: number; quantity: number; costPrice?: number }>;
}): Promise<StockRefill> {
  const res = await api.post('/refills', data);
  return res.data.data;
}
