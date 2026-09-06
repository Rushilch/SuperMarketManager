import { api } from './client';
import { Customer } from '../types';

export async function getCustomersApi(): Promise<Customer[]> {
  const res = await api.get('/customers');
  return res.data.data;
}

export async function getCustomerByIdApi(id: number): Promise<Customer> {
  const res = await api.get(`/customers/${id}`);
  return res.data.data;
}

export async function createCustomerApi(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}): Promise<Customer> {
  const res = await api.post('/customers', data);
  return res.data.data;
}

export async function lookupCustomerByPhoneApi(phone: string): Promise<Customer | null> {
  try {
    const res = await api.get('/customers/lookup', {
      params: { phone },
    });
    return res.data.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}
