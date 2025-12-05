import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { upload } from '../middleware/upload';
import {
  getTeacherProfile,
  updateTeacherProfile,
  uploadVerificationDocument,
  getMyCourses,
  getEarnings,
} from '../controllers/teacherController';

const router = Router();

router.get('/profile', authenticate, authorize('TEACHER'), getTeacherProfile);

router.put('/profile', authenticate, authorize('TEACHER'), updateTeacherProfile);

router.post(
  '/verification-document',
  authenticate,
  authorize('TEACHER'),
  upload.single('document'),
  uploadVerificationDocument
);

router.get('/my-courses', authenticate, authorize('TEACHER'), getMyCourses);

router.get('/earnings', authenticate, authorize('TEACHER'), getEarnings);

export default router;
