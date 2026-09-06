import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';

export function createApp() {
  const app = express();

  // Enable CORS
  app.use(
    cors({
      origin: '*', // Allow all origins in dev, or config.corsOrigin
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API router
  app.use('/api', routes);

  // Handle unmatched routes
  app.all('*', (req, _res, next) => {
    next(new AppError(`Cannot find endpoint ${req.method} ${req.originalUrl} on this server.`, 404));
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

export default createApp();
