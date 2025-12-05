import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
} from '../controllers/reviewController';

const router = Router();

// Create review (students only)
router.post(
  '/',
  authenticate,
  authorize('STUDENT'),
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters'),
    validate,
  ],
  createReview
);

// Get reviews for course or teacher
router.get('/', getReviews);

// Update review (students only, own reviews)
router.put(
  '/:id',
  authenticate,
  authorize('STUDENT'),
  [
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters'),
    validate,
  ],
  updateReview
);

// Delete review (students own reviews or admin)
router.delete('/:id', authenticate, deleteReview);

export default router;