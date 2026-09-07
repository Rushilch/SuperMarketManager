"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProducts = getAllProducts;
exports.getLowStockProducts = getLowStockProducts;
exports.getProductById = getProductById;
exports.getProductByBarcode = getProductByBarcode;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.restockProduct = restockProduct;
const prisma_1 = __importDefault(require("../data-access/prisma"));
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
async function getAllProducts(lowStockOnly = false) {
    if (lowStockOnly) {
        return getLowStockProducts();
    }
    const products = await prisma_1.default.product.findMany({
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
async function getLowStockProducts() {
    // Products where physical quantityInStock <= reorderThreshold
    const rawProducts = await prisma_1.default.$queryRaw `
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
async function getProductById(id) {
    const product = await prisma_1.default.product.findUnique({
        where: { id },
        include: {
            stockMovements: {
                orderBy: { createdAt: 'desc' },
                take: 20,
            },
        },
    });
    if (!product) {
        throw new AppError_1.AppError(`Product with ID ${id} not found.`, 404);
    }
    return {
        ...product,
        isLowStock: product.quantityInStock <= product.reorderThreshold,
    };
}
async function getProductByBarcode(code) {
    const cleanCode = code.trim();
    if (!cleanCode) {
        throw new AppError_1.AppError('Barcode or SKU code is required.', 400);
    }
    const product = await prisma_1.default.product.findFirst({
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
        throw new AppError_1.AppError(`Product not found with barcode or SKU: "${cleanCode}".`, 404);
    }
    return {
        ...product,
        isLowStock: product.quantityInStock <= product.reorderThreshold,
    };
}
async function createProduct(data) {
    const existingSku = await prisma_1.default.product.findUnique({
        where: { sku: data.sku.trim().toUpperCase() },
    });
    if (existingSku) {
        throw new AppError_1.AppError(`Product with SKU "${data.sku}" already exists.`, 409);
    }
    if (data.barcode) {
        const existingBarcode = await prisma_1.default.product.findUnique({
            where: { barcode: data.barcode.trim() },
        });
        if (existingBarcode) {
            throw new AppError_1.AppError(`Product with barcode "${data.barcode}" already exists.`, 409);
        }
    }
    const initialQty = data.quantityInStock ?? 0;
    return prisma_1.default.$transaction(async (tx) => {
        const product = await tx.product.create({
            data: {
                name: data.name.trim(),
                sku: data.sku.trim().toUpperCase(),
                barcode: data.barcode?.trim() || null,
                category: data.category?.trim() || 'General',
                description: data.description?.trim() || null,
                unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
                quantityInStock: initialQty,
                reorderThreshold: data.reorderThreshold ?? 10,
            },
        });
        if (initialQty > 0) {
            await tx.stockMovement.create({
                data: {
                    productId: product.id,
                    changeQuantity: initialQty,
                    reason: client_1.MovementReason.restock,
                },
            });
        }
        return product;
    });
}
async function updateProduct(id, data) {
    const existing = await prisma_1.default.product.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError_1.AppError(`Product with ID ${id} not found.`, 404);
    }
    if (data.sku && data.sku.trim().toUpperCase() !== existing.sku) {
        const conflict = await prisma_1.default.product.findUnique({
            where: { sku: data.sku.trim().toUpperCase() },
        });
        if (conflict) {
            throw new AppError_1.AppError(`SKU "${data.sku}" is already in use by another product.`, 409);
        }
    }
    if (data.barcode && data.barcode.trim() !== existing.barcode) {
        const conflictBarcode = await prisma_1.default.product.findUnique({
            where: { barcode: data.barcode.trim() },
        });
        if (conflictBarcode) {
            throw new AppError_1.AppError(`Barcode "${data.barcode}" is already in use by another product.`, 409);
        }
    }
    return prisma_1.default.product.update({
        where: { id },
        data: {
            name: data.name?.trim(),
            sku: data.sku?.trim().toUpperCase(),
            barcode: data.barcode !== undefined ? data.barcode?.trim() || null : undefined,
            category: data.category?.trim() || undefined,
            description: data.description !== undefined ? data.description?.trim() || null : undefined,
            unitPrice: data.unitPrice !== undefined ? new client_1.Prisma.Decimal(data.unitPrice) : undefined,
            reorderThreshold: data.reorderThreshold,
        },
    });
}
async function restockProduct(id, quantityToAdd) {
    if (quantityToAdd <= 0) {
        throw new AppError_1.AppError('Restock quantity must be greater than zero.', 400);
    }
    return prisma_1.default.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id } });
        if (!product) {
            throw new AppError_1.AppError(`Product with ID ${id} not found.`, 404);
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
                reason: client_1.MovementReason.restock,
            },
        });
        return updated;
    });
}
