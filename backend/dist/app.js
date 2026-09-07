"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const AppError_1 = require("./utils/AppError");
function createApp() {
    const app = (0, express_1.default)();
    // Enable CORS
    app.use((0, cors_1.default)({
        origin: '*', // Allow all origins in dev, or config.corsOrigin
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    // Body parsing
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Health check
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // Mount API router
    app.use('/api', routes_1.default);
    // Handle unmatched routes
    app.all('*', (req, _res, next) => {
        next(new AppError_1.AppError(`Cannot find endpoint ${req.method} ${req.originalUrl} on this server.`, 404));
    });
    // Centralized error handler
    app.use(errorHandler_1.errorHandler);
    return app;
}
exports.default = createApp();
