import { Router } from 'express';
import * as refillController from '../controllers/refill.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', refillController.getAll);
router.get('/:id', refillController.getById);
router.post('/', validateBody(refillController.createRefillSchema), refillController.create);

export default router;
