import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { loginAdmin } from '../controllers/authController';
import {
  getDashboardStats,
  getAdminCourses,
  getAdminTeachers,
  getAdminStudents,
  getAdminPayments,
  getSystemStats,
} from '../controllers/adminController';

const router = Router();

// Public admin login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  loginAdmin
);

// Protected admin routes (require ADMIN role)
router.get('/dashboard/stats', authenticate, authorize('ADMIN'), getDashboardStats);

router.get(
  '/courses',
  authenticate,
  authorize('ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  getAdminCourses
);

router.get(
  '/teachers',
  authenticate,
  authorize('ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  getAdminTeachers
);

router.get(
  '/students',
  authenticate,
  authorize('ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  getAdminStudents
);

router.get(
  '/payments',
  authenticate,
  authorize('ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  getAdminPayments
);

router.get('/system/stats', authenticate, authorize('ADMIN'), getSystemStats);

export default router;
