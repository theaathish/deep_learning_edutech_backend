import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { submitContactMessage, getContactMessages, markMessageAsRead } from '../controllers/contactController';

const router = Router();

// Public route for submitting contact messages
router.post('/', submitContactMessage);

// Admin routes for managing messages
router.get('/', authenticate, authorize('ADMIN'), getContactMessages);
router.put('/:id/read', authenticate, authorize('ADMIN'), markMessageAsRead);

export default router;