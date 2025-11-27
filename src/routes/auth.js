import express from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  logout,
  getProfile 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  registerValidation, 
  loginValidation, 
  handleValidationErrors 
} from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', authLimiter, registerValidation, handleValidationErrors, register);
router.post('/login', authLimiter, loginValidation, handleValidationErrors, login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);

export default router;
