// src/controllers/authController.js
import { AuthService } from '../services/authService.js';

export const AuthController = {
  async signup(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.signup(email, password);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};

export default AuthController;