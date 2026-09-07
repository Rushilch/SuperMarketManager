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
exports.createRefillSchema = void 0;
exports.getAll = getAll;
exports.getById = getById;
exports.create = create;
const zod_1 = require("zod");
const refillService = __importStar(require("../services/refill.service"));
exports.createRefillSchema = zod_1.z.object({
    supplierName: zod_1.z.string().min(1, 'Supplier name is required'),
    referenceNo: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional().nullable(),
    receivedBy: zod_1.z.string().optional().nullable(),
    items: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.number().int().positive('Valid product ID is required'),
        quantity: zod_1.z.number().int().positive('Quantity must be a positive integer'),
        costPrice: zod_1.z.number().positive().optional(),
    }))
        .min(1, 'At least one item is required in a stock refill delivery'),
});
async function getAll(_req, res, next) {
    try {
        const refills = await refillService.getAllRefills();
        res.json({ status: 'success', data: refills });
    }
    catch (error) {
        next(error);
    }
}
async function getById(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const refill = await refillService.getRefillById(id);
        res.json({ status: 'success', data: refill });
    }
    catch (error) {
        next(error);
    }
}
async function create(req, res, next) {
    try {
        const refill = await refillService.createRefill(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Stock refill delivery logged successfully. Inventory quantities updated.',
            data: refill,
        });
    }
    catch (error) {
        next(error);
    }
}
