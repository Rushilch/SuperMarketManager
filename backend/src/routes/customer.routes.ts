import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', customerController.getAll);
router.get('/lookup', customerController.lookup);
router.get('/:id', customerController.getById);
router.post('/', validateBody(customerController.createCustomerSchema), customerController.create);

export default router;
