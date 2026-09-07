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
exports.createCustomerSchema = void 0;
exports.getAll = getAll;
exports.lookup = lookup;
exports.getById = getById;
exports.create = create;
const zod_1 = require("zod");
const customerService = __importStar(require("../services/customer.service"));
exports.createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Customer name is required'),
    email: zod_1.z.string().email('Invalid email address').optional().nullable().or(zod_1.z.literal('')),
    phone: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
});
async function getAll(req, res, next) {
    try {
        const customers = await customerService.getAllCustomers();
        res.json({ status: 'success', data: customers });
    }
    catch (error) {
        next(error);
    }
}
async function lookup(req, res, next) {
    try {
        const phone = req.query.phone;
        if (!phone) {
            return res.status(400).json({ status: 'fail', message: 'Phone query parameter is required' });
        }
        const customer = await customerService.getCustomerByPhone(phone);
        if (!customer) {
            return res.status(404).json({ status: 'fail', message: 'Customer not found with this mobile number' });
        }
        res.json({ status: 'success', data: customer });
    }
    catch (error) {
        next(error);
    }
}
async function getById(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const customer = await customerService.getCustomerById(id);
        res.json({ status: 'success', data: customer });
    }
    catch (error) {
        next(error);
    }
}
async function create(req, res, next) {
    try {
        const customer = await customerService.createCustomer(req.body);
        res.status(201).json({ status: 'success', data: customer });
    }
    catch (error) {
        next(error);
    }
}
