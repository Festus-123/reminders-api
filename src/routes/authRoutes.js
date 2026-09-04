// src/routes/authRoutes.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controller/authController.js';

const router = Router();

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per window
  message: 'Too many login attempts, try again later',
});

router.post('/signup', AuthController.signup);
router.post('/login', rateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);

export default router;