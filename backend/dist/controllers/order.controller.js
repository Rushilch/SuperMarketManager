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
exports.updateDeliveryStatusSchema = exports.updateStatusSchema = exports.createOrderSchema = void 0;
exports.getAll = getAll;
exports.getById = getById;
exports.create = create;
exports.updateStatus = updateStatus;
exports.updateDeliveryStatus = updateDeliveryStatus;
exports.getDashboard = getDashboard;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const orderService = __importStar(require("../services/order.service"));
exports.createOrderSchema = zod_1.z.object({
    customerId: zod_1.z.number().int().positive('Valid customer ID is required'),
    status: zod_1.z.nativeEnum(client_1.OrderStatus).optional(),
    orderType: zod_1.z.nativeEnum(client_1.OrderType).optional(),
    deliveryStatus: zod_1.z.nativeEnum(client_1.DeliveryStatus).optional(),
    deliveryAddress: zod_1.z.string().optional().nullable(),
    deliveryNotes: zod_1.z.string().optional().nullable(),
    cashierId: zod_1.z.number().int().positive().optional().nullable(),
    items: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.number().int().positive('Valid product ID is required'),
        quantity: zod_1.z.number().int().positive('Quantity must be a positive integer'),
    }))
        .min(1, 'At least one line item is required'),
});
exports.updateStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.OrderStatus),
});
exports.updateDeliveryStatusSchema = zod_1.z.object({
    deliveryStatus: zod_1.z.nativeEnum(client_1.DeliveryStatus),
});
async function getAll(req, res, next) {
    try {
        const status = req.query.status;
        const orderType = req.query.orderType;
        const orders = await orderService.getAllOrders(status, orderType);
        res.json({ status: 'success', data: orders });
    }
    catch (error) {
        next(error);
    }
}
async function getById(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const order = await orderService.getOrderById(id);
        res.json({ status: 'success', data: order });
    }
    catch (error) {
        next(error);
    }
}
async function create(req, res, next) {
    try {
        const order = await orderService.createOrder(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Order created successfully and inventory stock deducted.',
            data: order,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateStatus(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const { status } = req.body;
        const order = await orderService.updateOrderStatus(id, status);
        res.json({
            status: 'success',
            message: `Order status updated to ${status}.`,
            data: order,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateDeliveryStatus(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const { deliveryStatus } = req.body;
        const order = await orderService.updateDeliveryStatus(id, deliveryStatus);
        res.json({
            status: 'success',
            message: `Delivery status updated to ${deliveryStatus}.`,
            data: order,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getDashboard(req, res, next) {
    try {
        const stats = await orderService.getDashboardStats();
        res.json({ status: 'success', data: stats });
    }
    catch (error) {
        next(error);
    }
}
