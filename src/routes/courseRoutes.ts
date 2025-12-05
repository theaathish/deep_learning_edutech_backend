import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse,
} from '../controllers/courseController';

const router = Router();

router.get('/', getCourses);

router.get('/:id', getCourseById);

router.post(
  '/',
  authenticate,
  authorize('TEACHER', 'ADMIN'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('duration').isInt({ min: 1 }).withMessage('Valid duration is required'),
    validate,
  ],
  createCourse
);

router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), updateCourse);

router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), deleteCourse);

router.post('/:id/publish', authenticate, authorize('TEACHER', 'ADMIN'), publishCourse);

export default router;
