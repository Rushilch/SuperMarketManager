"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function signToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    }, env_1.config.jwtSecret, {
        expiresIn: env_1.config.jwtExpiresIn,
    });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
}
