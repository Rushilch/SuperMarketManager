import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', orderController.getAll);
router.get('/:id', orderController.getById);
router.post('/', validateBody(orderController.createOrderSchema), orderController.create);
router.patch(
  '/:id/status',
  validateBody(orderController.updateStatusSchema),
  orderController.updateStatus
);
router.patch(
  '/:id/delivery-status',
  validateBody(orderController.updateDeliveryStatusSchema),
  orderController.updateDeliveryStatus
);

export default router;
