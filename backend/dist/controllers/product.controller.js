"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.restockProductSchema = exports.updateProductSchema = exports.createProductSchema = void 0;
exports.getAll = getAll;
exports.getLowStock = getLowStock;
exports.getByBarcode = getByBarcode;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.restock = restock;
const zod_1 = require("zod");
const productService = __importStar(require("../services/product.service"));
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Product name is required'),
    sku: zod_1.z.string().min(1, 'SKU is required'),
    barcode: zod_1.z.string().optional().nullable(),
    category: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    unitPrice: zod_1.z.number().positive('Unit price must be positive'),
    quantityInStock: zod_1.z.number().int().min(0, 'Quantity cannot be negative').optional(),
    reorderThreshold: zod_1.z.number().int().min(0, 'Reorder threshold cannot be negative').optional(),
});
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    sku: zod_1.z.string().min(1).optional(),
    barcode: zod_1.z.string().optional().nullable(),
    category: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    unitPrice: zod_1.z.number().positive().optional(),
    reorderThreshold: zod_1.z.number().int().min(0).optional(),
});
exports.restockProductSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().positive('Restock quantity must be a positive integer'),
});
async function getAll(req, res, next) {
    try {
        const lowStockOnly = req.query.lowStock === 'true';
        const products = await productService.getAllProducts(lowStockOnly);
        res.json({ status: 'success', data: products });
    }
    catch (error) {
        next(error);
    }
}
async function getLowStock(_req, res, next) {
    try {
        const products = await productService.getLowStockProducts();
        res.json({ status: 'success', data: products });
    }
    catch (error) {
        next(error);
    }
}
async function getByBarcode(req, res, next) {
    try {
        const code = req.params.code;
        const product = await productService.getProductByBarcode(code);
        res.json({ status: 'success', data: product });
    }
    catch (error) {
        next(error);
    }
}
async function getById(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const product = await productService.getProductById(id);
        res.json({ status: 'success', data: product });
    }
    catch (error) {
        next(error);
    }
}
async function create(req, res, next) {
    try {
        const product = await productService.createProduct(req.body);
        res.status(201).json({ status: 'success', data: product });
    }
    catch (error) {
        next(error);
    }
}
async function update(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const product = await productService.updateProduct(id, req.body);
        res.json({ status: 'success', data: product });
    }
    catch (error) {
        next(error);
    }
}
async function restock(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const { quantity } = req.body;
        const updated = await productService.restockProduct(id, quantity);
        res.json({
            status: 'success',
            message: `Successfully restocked ${quantity} units.`,
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
}
