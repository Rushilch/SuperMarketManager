"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const AppError_1 = require("../utils/AppError");
const client_1 = require("@prisma/client");
function errorHandler(err, _req, res, _next) {
    // Operational AppError
    if (err instanceof AppError_1.AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
        return;
    }
    // Prisma Unique Constraint Error (P2002)
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const target = err.meta?.target?.join(', ') || 'field';
            res.status(409).json({
                status: 'error',
                message: `A record with this ${target} already exists.`,
            });
            return;
        }
        if (err.code === 'P2025') {
            res.status(404).json({
                status: 'error',
                message: 'The requested record was not found.',
            });
            return;
        }
    }
    // Unhandled server error
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
}
