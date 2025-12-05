import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  createOrder,
  verifyPayment,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getPaymentHistory,
  handleWebhook,
} from '../controllers/paymentController';

const router = Router();

// Course enrollment payment
router.post(
  '/create-order',
  authenticate,
  authorize('STUDENT'),
  [
    body('courseId').notEmpty().withMessage('Course ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
    validate,
  ],
  createOrder
);

router.post(
  '/verify',
  authenticate,
  [
    body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Signature is required'),
    validate,
  ],
  verifyPayment
);

// Tutor Stand subscription payment
router.post(
  '/subscription/create-order',
  authenticate,
  authorize('TEACHER'),
  [
    body('plan').isIn(['monthly', 'yearly']).withMessage('Plan must be monthly or yearly'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
    validate,
  ],
  createSubscriptionOrder
);

router.post(
  '/subscription/verify',
  authenticate,
  authorize('TEACHER'),
  [
    body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Signature is required'),
    validate,
  ],
  verifySubscriptionPayment
);

// Payment history
router.get('/history', authenticate, authorize('STUDENT'), getPaymentHistory);

// Razorpay webhook (no auth - verified by signature)
router.post('/webhook', handleWebhook);

export default router;
