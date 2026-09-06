import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import customerRoutes from './customer.routes';
import orderRoutes from './order.routes';
import refillRoutes from './refill.routes';
import { authenticate } from '../middleware/auth';
import { getDashboard } from '../controllers/order.controller';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/refills', refillRoutes);
router.get('/dashboard/stats', authenticate, getDashboard);

export default router;
