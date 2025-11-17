import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  validateToken,
  changePassword,
  resetPassword,
  verifyEmail,
  updateProfile,
  deleteAccount,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/validate', validateToken);
router.post('/logout', logout);
router.post('/change-password', changePassword);
router.patch('/profile', updateProfile);
router.delete('/account', deleteAccount);

export default router;
