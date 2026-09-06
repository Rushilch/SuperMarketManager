import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { Role } from '@prisma/client';

const router = Router();

router.post('/login', validateBody(authController.loginSchema), authController.login);
router.post(
  '/register',
  authenticate,
  requireRole(Role.admin),
  validateBody(authController.registerSchema),
  authController.register
);
router.get('/me', authenticate, authController.me);

export default router;
