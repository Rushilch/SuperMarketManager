import { api } from './client';
import { User } from '../types';

export interface LoginResponse {
  status: string;
  data: {
    token: string;
    user: User;
  };
}

export async function loginApi(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password });
  return res.data.data;
}

export async function registerApi(data: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'staff';
}): Promise<User> {
  const res = await api.post('/auth/register', data);
  return res.data.data.user;
}

export async function getMeApi(): Promise<User> {
  const res = await api.get('/auth/me');
  return res.data.data.user;
}
