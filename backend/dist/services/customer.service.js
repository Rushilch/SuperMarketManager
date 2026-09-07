"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCustomers = getAllCustomers;
exports.getCustomerById = getCustomerById;
exports.getCustomerByPhone = getCustomerByPhone;
exports.createCustomer = createCustomer;
const prisma_1 = __importDefault(require("../data-access/prisma"));
const AppError_1 = require("../utils/AppError");
async function getAllCustomers() {
    return prisma_1.default.customer.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { orders: true },
            },
        },
    });
}
async function getCustomerById(id) {
    const customer = await prisma_1.default.customer.findUnique({
        where: { id },
        include: {
            orders: {
                orderBy: { createdAt: 'desc' },
                include: {
                    items: {
                        include: { product: true },
                    },
                },
            },
        },
    });
    if (!customer) {
        throw new AppError_1.AppError(`Customer with ID ${id} not found.`, 404);
    }
    return customer;
}
async function getCustomerByPhone(phone) {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
        throw new AppError_1.AppError('Phone number is required for lookup.', 400);
    }
    // Find by exact match or substring/suffix
    const customer = await prisma_1.default.customer.findFirst({
        where: {
            OR: [
                { phone: cleanPhone },
                { phone: { contains: cleanPhone.replace(/[\s\-\(\)]/g, '') } },
            ],
        },
        include: {
            _count: {
                select: { orders: true },
            },
        },
    });
    return customer;
}
async function createCustomer(data) {
    const trimmedName = data.name.trim();
    const trimmedEmail = data.email?.toLowerCase().trim() || null;
    const trimmedPhone = data.phone?.trim() || null;
    if (trimmedEmail) {
        const existingEmail = await prisma_1.default.customer.findUnique({
            where: { email: trimmedEmail },
        });
        if (existingEmail) {
            throw new AppError_1.AppError(`Customer with email "${trimmedEmail}" already exists.`, 409);
        }
    }
    if (trimmedPhone) {
        const existingPhone = await prisma_1.default.customer.findUnique({
            where: { phone: trimmedPhone },
        });
        if (existingPhone) {
            throw new AppError_1.AppError(`Customer with phone "${trimmedPhone}" already exists.`, 409);
        }
    }
    return prisma_1.default.customer.create({
        data: {
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
            address: data.address?.trim() || null,
            loyaltyPoints: 10, // Initial welcome loyalty bonus
        },
    });
}
