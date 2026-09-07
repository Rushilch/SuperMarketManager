"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = loginUser;
exports.registerStaffUser = registerStaffUser;
const prisma_1 = __importDefault(require("../data-access/prisma"));
const client_1 = require("@prisma/client");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const AppError_1 = require("../utils/AppError");
async function loginUser(email, password) {
    const user = await prisma_1.default.user.findUnique({
        where: { email: email.toLowerCase().trim() },
    });
    if (!user) {
        throw new AppError_1.AppError('Invalid email or password.', 401);
    }
    const isMatch = await (0, password_1.comparePassword)(password, user.passwordHash);
    if (!isMatch) {
        throw new AppError_1.AppError('Invalid email or password.', 401);
    }
    const authUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    };
    const token = (0, jwt_1.signToken)(authUser);
    return { token, user: authUser };
}
async function registerStaffUser(data) {
    const existing = await prisma_1.default.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
        throw new AppError_1.AppError('A user with this email address already exists.', 409);
    }
    const passwordHash = await (0, password_1.hashPassword)(data.password);
    const newUser = await prisma_1.default.user.create({
        data: {
            name: data.name.trim(),
            email: data.email.toLowerCase().trim(),
            passwordHash,
            role: data.role || client_1.Role.staff,
        },
    });
    return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
    };
}
