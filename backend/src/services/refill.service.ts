import prisma from '../data-access/prisma';
import { MovementReason, Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

export interface RefillItemInput {
  productId: number;
  quantity: number;
  costPrice?: number;
}

export interface CreateRefillInput {
  supplierName: string;
  referenceNo?: string;
  notes?: string;
  receivedBy?: string;
  items: RefillItemInput[];
}

export async function getAllRefills() {
  return prisma.stockRefill.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getRefillById(id: number) {
  const refill = await prisma.stockRefill.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!refill) {
    throw new AppError(`Stock refill with ID ${id} not found.`, 404);
  }

  return refill;
}

export async function createRefill(input: CreateRefillInput) {
  if (!input.items || input.items.length === 0) {
    throw new AppError('A stock refill must contain at least one item.', 400);
  }

  for (const item of input.items) {
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new AppError('Each refill item must have a valid productId and quantity > 0.', 400);
    }
  }

  const supplier = input.supplierName?.trim() || 'Supermarket Central Distribution';
  const refNo =
    input.referenceNo?.trim().toUpperCase() ||
    `REFILL-${Date.now().toString().slice(-6)}`;

  const totalQuantity = input.items.reduce((sum, item) => sum + item.quantity, 0);

  return prisma.$transaction(async (tx) => {
    // 1. Verify products exist
    const productIds = input.items.map((i) => i.productId);
    const existingProducts = await tx.product.findMany({
      where: { id: { in: productIds } },
    });

    if (existingProducts.length !== productIds.length) {
      const foundIds = new Set(existingProducts.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      throw new AppError(`Product(s) not found for ID(s): ${missing.join(', ')}`, 404);
    }

    // 2. Create Stock Refill header
    const createdRefill = await tx.stockRefill.create({
      data: {
        referenceNo: refNo,
        supplierName: supplier,
        notes: input.notes?.trim() || null,
        receivedBy: input.receivedBy?.trim() || 'Store Cashier/Staff',
        totalItems: totalQuantity,
        status: 'received',
      },
    });

    // 3. For each item: create refill item, increment stock, and record audit stock movement
    for (const item of input.items) {
      await tx.stockRefillItem.create({
        data: {
          refillId: createdRefill.id,
          productId: item.productId,
          quantity: item.quantity,
          costPrice: item.costPrice !== undefined ? new Prisma.Decimal(item.costPrice) : undefined,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantityInStock: { increment: item.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          changeQuantity: item.quantity,
          reason: MovementReason.restock,
        },
      });
    }

    // 4. Return populated refill
    return tx.stockRefill.findUniqueOrThrow({
      where: { id: createdRefill.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  });
}
