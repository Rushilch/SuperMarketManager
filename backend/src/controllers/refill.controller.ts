import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as refillService from '../services/refill.service';

export const createRefillSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required'),
  referenceNo: z.string().optional(),
  notes: z.string().optional().nullable(),
  receivedBy: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive('Valid product ID is required'),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
        costPrice: z.number().positive().optional(),
      })
    )
    .min(1, 'At least one item is required in a stock refill delivery'),
});

export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const refills = await refillService.getAllRefills();
    res.json({ status: 'success', data: refills });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const refill = await refillService.getRefillById(id);
    res.json({ status: 'success', data: refill });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const refill = await refillService.createRefill(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Stock refill delivery logged successfully. Inventory quantities updated.',
      data: refill,
    });
  } catch (error) {
    next(error);
  }
}
