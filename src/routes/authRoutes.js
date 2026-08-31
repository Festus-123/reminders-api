// src/routes/authRoutes.js
import { Router } from 'express';
import { AuthController } from '../controller/authController.js';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);

export default router;