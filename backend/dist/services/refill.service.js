"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRefills = getAllRefills;
exports.getRefillById = getRefillById;
exports.createRefill = createRefill;
const prisma_1 = __importDefault(require("../data-access/prisma"));
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
async function getAllRefills() {
    return prisma_1.default.stockRefill.findMany({
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
async function getRefillById(id) {
    const refill = await prisma_1.default.stockRefill.findUnique({
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
        throw new AppError_1.AppError(`Stock refill with ID ${id} not found.`, 404);
    }
    return refill;
}
async function createRefill(input) {
    if (!input.items || input.items.length === 0) {
        throw new AppError_1.AppError('A stock refill must contain at least one item.', 400);
    }
    for (const item of input.items) {
        if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
            throw new AppError_1.AppError('Each refill item must have a valid productId and quantity > 0.', 400);
        }
    }
    const supplier = input.supplierName?.trim() || 'Supermarket Central Distribution';
    const refNo = input.referenceNo?.trim().toUpperCase() ||
        `REFILL-${Date.now().toString().slice(-6)}`;
    const totalQuantity = input.items.reduce((sum, item) => sum + item.quantity, 0);
    return prisma_1.default.$transaction(async (tx) => {
        // 1. Verify products exist
        const productIds = input.items.map((i) => i.productId);
        const existingProducts = await tx.product.findMany({
            where: { id: { in: productIds } },
        });
        if (existingProducts.length !== productIds.length) {
            const foundIds = new Set(existingProducts.map((p) => p.id));
            const missing = productIds.filter((id) => !foundIds.has(id));
            throw new AppError_1.AppError(`Product(s) not found for ID(s): ${missing.join(', ')}`, 404);
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
                    costPrice: item.costPrice !== undefined ? new client_1.Prisma.Decimal(item.costPrice) : undefined,
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
                    reason: client_1.MovementReason.restock,
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
