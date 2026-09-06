import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/low-stock', productController.getLowStock);
router.get('/barcode/:code', productController.getByBarcode);
router.get('/', productController.getAll);
router.get('/:id', productController.getById);

// Admin-only management endpoints
router.post(
  '/',
  requireRole(Role.admin),
  validateBody(productController.createProductSchema),
  productController.create
);

router.patch(
  '/:id',
  requireRole(Role.admin),
  validateBody(productController.updateProductSchema),
  productController.update
);

router.post(
  '/:id/restock',
  requireRole(Role.admin),
  validateBody(productController.restockProductSchema),
  productController.restock
);

export default router;
