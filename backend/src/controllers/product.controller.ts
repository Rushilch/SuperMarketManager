import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as productService from '../services/product.service';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional().nullable(),
  category: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().positive('Unit price must be positive'),
  quantityInStock: z.number().int().min(0, 'Quantity cannot be negative').optional(),
  reorderThreshold: z.number().int().min(0, 'Reorder threshold cannot be negative').optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  barcode: z.string().optional().nullable(),
  category: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().positive().optional(),
  reorderThreshold: z.number().int().min(0).optional(),
});

export const restockProductSchema = z.object({
  quantity: z.number().int().positive('Restock quantity must be a positive integer'),
});

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const lowStockOnly = req.query.lowStock === 'true';
    const products = await productService.getAllProducts(lowStockOnly);
    res.json({ status: 'success', data: products });
  } catch (error) {
    next(error);
  }
}

export async function getLowStock(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productService.getLowStockProducts();
    res.json({ status: 'success', data: products });
  } catch (error) {
    next(error);
  }
}

export async function getByBarcode(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params.code;
    const product = await productService.getProductByBarcode(code);
    res.json({ status: 'success', data: product });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await productService.getProductById(id);
    res.json({ status: 'success', data: product });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ status: 'success', data: product });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await productService.updateProduct(id, req.body);
    res.json({ status: 'success', data: product });
  } catch (error) {
    next(error);
  }
}

export async function restock(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const { quantity } = req.body;
    const updated = await productService.restockProduct(id, quantity);
    res.json({
      status: 'success',
      message: `Successfully restocked ${quantity} units.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
