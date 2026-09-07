"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const prisma_1 = __importDefault(require("./data-access/prisma"));
async function bootstrap() {
    try {
        // Verify database connection
        await prisma_1.default.$connect();
        console.log('Successfully connected to PostgreSQL via Prisma Client.');
        const server = app_1.default.listen(env_1.config.port, () => {
            console.log(`Inventory Backend server running on http://localhost:${env_1.config.port}`);
            console.log(`Environment: ${env_1.config.nodeEnv}`);
        });
        const shutdown = async () => {
            console.log('Shutting down server gracefully...');
            server.close(async () => {
                await prisma_1.default.$disconnect();
                console.log('Database disconnected.');
                process.exit(0);
            });
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
    catch (error) {
        console.error('Failed to start backend server:', error);
        await prisma_1.default.$disconnect();
        process.exit(1);
    }
}
bootstrap();
