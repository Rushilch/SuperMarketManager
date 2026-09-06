import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderStatus, OrderType, DeliveryStatus } from '@prisma/client';
import * as orderService from '../services/order.service';

export const createOrderSchema = z.object({
  customerId: z.number().int().positive('Valid customer ID is required'),
  status: z.nativeEnum(OrderStatus).optional(),
  orderType: z.nativeEnum(OrderType).optional(),
  deliveryStatus: z.nativeEnum(DeliveryStatus).optional(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
  cashierId: z.number().int().positive().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive('Valid product ID is required'),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
      })
    )
    .min(1, 'At least one line item is required'),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export const updateDeliveryStatusSchema = z.object({
  deliveryStatus: z.nativeEnum(DeliveryStatus),
});

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as OrderStatus | undefined;
    const orders = await orderService.getAllOrders(status);
    res.json({ status: 'success', data: orders });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await orderService.getOrderById(id);
    res.json({ status: 'success', data: order });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Order created successfully and inventory stock deducted.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(id, status);
    res.json({
      status: 'success',
      message: `Order status updated to ${status}.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDeliveryStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const { deliveryStatus } = req.body;
    const order = await orderService.updateDeliveryStatus(id, deliveryStatus);
    res.json({
      status: 'success',
      message: `Delivery status updated to ${deliveryStatus}.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await orderService.getDashboardStats();
    res.json({ status: 'success', data: stats });
  } catch (error) {
    next(error);
  }
}
