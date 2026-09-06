import { api } from './client';
import { Product } from '../types';

export async function getProductsApi(lowStockOnly: boolean = false): Promise<Product[]> {
  const res = await api.get('/products', { params: { lowStock: lowStockOnly } });
  return res.data.data;
}

export async function getLowStockProductsApi(): Promise<Product[]> {
  const res = await api.get('/products/low-stock');
  return res.data.data;
}

export async function getProductByIdApi(id: number): Promise<Product> {
  const res = await api.get(`/products/${id}`);
  return res.data.data;
}

export async function getProductByBarcodeApi(code: string): Promise<Product> {
  const res = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
  return res.data.data;
}

export async function createProductApi(data: {
  name: string;
  sku: string;
  barcode?: string | null;
  category?: string;
  description?: string;
  unitPrice: number;
  quantityInStock: number;
  reorderThreshold: number;
}): Promise<Product> {
  const res = await api.post('/products', data);
  return res.data.data;
}

export async function updateProductApi(
  id: number,
  data: {
    name?: string;
    sku?: string;
    barcode?: string | null;
    category?: string;
    description?: string;
    unitPrice?: number;
    reorderThreshold?: number;
  }
): Promise<Product> {
  const res = await api.patch(`/products/${id}`, data);
  return res.data.data;
}

export async function restockProductApi(id: number, quantity: number): Promise<Product> {
  const res = await api.post(`/products/${id}/restock`, { quantity });
  return res.data.data;
}
