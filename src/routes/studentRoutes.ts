import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  getStudentProfile,
  updateStudentProfile,
  getDashboardStats,
} from '../controllers/studentController';

const router = Router();

// Get student profile
router.get('/profile', authenticate, authorize('STUDENT'), getStudentProfile);

// Update student profile
router.put(
  '/profile',
  authenticate,
  authorize('STUDENT'),
  [
    body('grade').optional().isLength({ max: 50 }).withMessage('Grade must be less than 50 characters'),
    body('school').optional().isLength({ max: 100 }).withMessage('School must be less than 100 characters'),
    body('interests').optional().isArray().withMessage('Interests must be an array'),
    validate,
  ],
  updateStudentProfile
);

// Get dashboard statistics
router.get('/dashboard-stats', authenticate, authorize('STUDENT'), getDashboardStats);

export default router;