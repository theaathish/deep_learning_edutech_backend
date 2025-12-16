import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate';
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').optional().isIn(['STUDENT', 'TEACHER']).withMessage('Invalid role'),
    validate,
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  login
);

router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required'), validate],
  refreshAccessToken
);

router.post('/logout', logout);

router.get('/profile', authenticate, getProfile);

router.put('/profile', authenticate, updateProfile);

router.get(
  '/reset-password',
  [
    query('token').notEmpty().withMessage('Token is required'),
    query('email').isEmail().withMessage('Valid email is required'),
    validate,
  ],
  verifyResetToken
);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required'), validate],
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    validate,
  ],
  resetPassword
);

export default router;
