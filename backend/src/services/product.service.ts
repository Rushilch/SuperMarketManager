import prisma from '../data-access/prisma';
import { MovementReason, Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

export async function getAllProducts(lowStockOnly: boolean = false) {
  if (lowStockOnly) {
    return getLowStockProducts();
  }

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { orderItems: true, stockMovements: true },
      },
    },
  });

  return products.map((p) => ({
    ...p,
    isLowStock: p.quantityInStock <= p.reorderThreshold,
  }));
}

export async function getLowStockProducts() {
  // Products where physical quantityInStock <= reorderThreshold
  const rawProducts = await prisma.$queryRaw<
    Array<{
      id: number;
      name: string;
      sku: string;
      description: string | null;
      unit_price: Prisma.Decimal;
      quantity_in_stock: number;
      reorder_threshold: number;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT id, name, sku, description, unit_price, quantity_in_stock, reorder_threshold, created_at, updated_at
    FROM products
    WHERE quantity_in_stock <= reorder_threshold
    ORDER BY (quantity_in_stock - reorder_threshold) ASC, name ASC
  `;

  return rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    unitPrice: p.unit_price,
    quantityInStock: p.quantity_in_stock,
    reorderThreshold: p.reorder_threshold,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    isLowStock: true,
  }));
}

export async function getProductById(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!product) {
    throw new AppError(`Product with ID ${id} not found.`, 404);
  }

  return {
    ...product,
    isLowStock: product.quantityInStock <= product.reorderThreshold,
  };
}

export async function getProductByBarcode(code: string) {
  const cleanCode = code.trim();
  if (!cleanCode) {
    throw new AppError('Barcode or SKU code is required.', 400);
  }

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { barcode: cleanCode },
        { sku: cleanCode.toUpperCase() },
      ],
    },
    include: {
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!product) {
    throw new AppError(`Product not found with barcode or SKU: "${cleanCode}".`, 404);
  }

  return {
    ...product,
    isLowStock: product.quantityInStock <= product.reorderThreshold,
  };
}

export async function createProduct(data: {
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  description?: string;
  unitPrice: number;
  quantityInStock?: number;
  reorderThreshold?: number;
}) {
  const existingSku = await prisma.product.findUnique({
    where: { sku: data.sku.trim().toUpperCase() },
  });

  if (existingSku) {
    throw new AppError(`Product with SKU "${data.sku}" already exists.`, 409);
  }

  if (data.barcode) {
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode: data.barcode.trim() },
    });
    if (existingBarcode) {
      throw new AppError(`Product with barcode "${data.barcode}" already exists.`, 409);
    }
  }

  const initialQty = data.quantityInStock ?? 0;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: data.name.trim(),
        sku: data.sku.trim().toUpperCase(),
        barcode: data.barcode?.trim() || null,
        category: data.category?.trim() || 'General',
        description: data.description?.trim() || null,
        unitPrice: new Prisma.Decimal(data.unitPrice),
        quantityInStock: initialQty,
        reorderThreshold: data.reorderThreshold ?? 10,
      },
    });

    if (initialQty > 0) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          changeQuantity: initialQty,
          reason: MovementReason.restock,
        },
      });
    }

    return product;
  });
}

export async function updateProduct(
  id: number,
  data: {
    name?: string;
    sku?: string;
    barcode?: string;
    category?: string;
    description?: string;
    unitPrice?: number;
    reorderThreshold?: number;
  }
) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(`Product with ID ${id} not found.`, 404);
  }

  if (data.sku && data.sku.trim().toUpperCase() !== existing.sku) {
    const conflict = await prisma.product.findUnique({
      where: { sku: data.sku.trim().toUpperCase() },
    });
    if (conflict) {
      throw new AppError(`SKU "${data.sku}" is already in use by another product.`, 409);
    }
  }

  if (data.barcode && data.barcode.trim() !== existing.barcode) {
    const conflictBarcode = await prisma.product.findUnique({
      where: { barcode: data.barcode.trim() },
    });
    if (conflictBarcode) {
      throw new AppError(`Barcode "${data.barcode}" is already in use by another product.`, 409);
    }
  }

  return prisma.product.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      sku: data.sku?.trim().toUpperCase(),
      barcode: data.barcode !== undefined ? data.barcode?.trim() || null : undefined,
      category: data.category?.trim() || undefined,
      description: data.description !== undefined ? data.description?.trim() || null : undefined,
      unitPrice: data.unitPrice !== undefined ? new Prisma.Decimal(data.unitPrice) : undefined,
      reorderThreshold: data.reorderThreshold,
    },
  });
}

export async function restockProduct(id: number, quantityToAdd: number) {
  if (quantityToAdd <= 0) {
    throw new AppError('Restock quantity must be greater than zero.', 400);
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError(`Product with ID ${id} not found.`, 404);
    }

    const updated = await tx.product.update({
      where: { id },
      data: {
        quantityInStock: { increment: quantityToAdd },
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: id,
        changeQuantity: quantityToAdd,
        reason: MovementReason.restock,
      },
    });

    return updated;
  });
}
