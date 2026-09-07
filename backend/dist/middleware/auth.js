"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jwt_1 = require("../utils/jwt");
const AppError_1 = require("../utils/AppError");
function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError_1.AppError('Authentication required. Missing or invalid Bearer token.', 401));
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        return next(new AppError_1.AppError('Invalid or expired authentication token.', 401));
    }
}
function requireRole(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new AppError_1.AppError('Authentication required.', 401));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError_1.AppError(`Forbidden. Requires role: ${allowedRoles.join(' or ')}. Your role is ${req.user.role}.`, 403));
        }
        next();
    };
}
