import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const getTeacherProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            profileImage: true,
          },
        },
        courses: {
          include: {
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
        tutorStandSubscription: true,
      },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    sendSuccess(res, teacher, 'Teacher profile retrieved successfully');
  } catch (error) {
    console.error('Get teacher profile error:', error);
    sendError(res, 'Failed to retrieve teacher profile', 500);
  }
};

export const updateTeacherProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    const { bio, specialization, experience, education } = req.body;

    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        ...(bio && { bio }),
        ...(specialization && { specialization }),
        ...(experience && { experience: parseInt(experience) }),
        ...(education && { education }),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    sendSuccess(res, updatedTeacher, 'Teacher profile updated successfully');
  } catch (error) {
    console.error('Update teacher profile error:', error);
    sendError(res, 'Failed to update teacher profile', 500);
  }
};

export const uploadVerificationDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    const documentUrl = `/uploads/${req.file.filename}`;

    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        verificationDocument: documentUrl,
        verificationStatus: 'PENDING',
      },
    });

    sendSuccess(res, updatedTeacher, 'Verification document uploaded successfully');
  } catch (error) {
    console.error('Upload verification document error:', error);
    sendError(res, 'Failed to upload verification document', 500);
  }
};

export const getMyCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, courses, 'Courses retrieved successfully');
  } catch (error) {
    console.error('Get my courses error:', error);
    sendError(res, 'Failed to retrieve courses', 500);
  }
};

export const getEarnings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    // Get enrollments with course and student info (these represent actual earnings)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        course: {
          teacherId: teacher.id,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Transform enrollments to earnings format
    const earnings = enrollments.map(enrollment => ({
      id: enrollment.id,
      courseId: enrollment.courseId,
      studentId: enrollment.studentId,
      createdAt: enrollment.enrolledAt.toISOString(),
      course: enrollment.course,
      student: enrollment.student,
    }));

    const total = earnings.reduce((sum, e) => sum + (e.course?.price || 0), 0);

    sendSuccess(
      res,
      { earnings, total },
      'Earnings retrieved successfully'
    );
  } catch (error) {
    console.error('Get earnings error:', error);
    sendError(res, 'Failed to retrieve earnings', 500);
  }
};
