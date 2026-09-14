import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  getCurrentUser,
  acceptTerms
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginLimiter, resendLimiter, registerLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public routes
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendLimiter, resendVerification);

// Protected routes (require valid session / token)
router.get('/me', authenticate, getCurrentUser);
router.post('/accept-terms', authenticate, acceptTerms);

export default router;
