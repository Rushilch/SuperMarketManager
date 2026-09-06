import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as customerService from '../services/customer.service';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
});

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const customers = await customerService.getAllCustomers();
    res.json({ status: 'success', data: customers });
  } catch (error) {
    next(error);
  }
}

export async function lookup(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = req.query.phone as string;
    if (!phone) {
      return res.status(400).json({ status: 'fail', message: 'Phone query parameter is required' });
    }
    const customer = await customerService.getCustomerByPhone(phone);
    if (!customer) {
      return res.status(404).json({ status: 'fail', message: 'Customer not found with this mobile number' });
    }
    res.json({ status: 'success', data: customer });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const customer = await customerService.getCustomerById(id);
    res.json({ status: 'success', data: customer });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json({ status: 'success', data: customer });
  } catch (error) {
    next(error);
  }
}
