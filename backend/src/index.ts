import app from './app';
import { config } from './config/env';
import prisma from './data-access/prisma';

async function bootstrap() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL via Prisma Client.');

    const server = app.listen(config.port, () => {
      console.log(`Inventory Backend server running on http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

    const shutdown = async () => {
      console.log('Shutting down server gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start backend server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
