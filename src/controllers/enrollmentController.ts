import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const enrollCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const { courseId } = req.body;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      sendError(res, 'Course not found', 404);
      return;
    }

    if (!course.isPublished) {
      sendError(res, 'Course is not published yet', 400);
      return;
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      sendError(res, 'Already enrolled in this course', 400);
      return;
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId,
      },
      include: {
        course: {
          include: {
            teacher: {
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
        },
      },
    });

    await prisma.course.update({
      where: { id: courseId },
      data: {
        totalEnrollments: {
          increment: 1,
        },
      },
    });

    sendSuccess(res, enrollment, 'Successfully enrolled in course', 201);
  } catch (error) {
    console.error('Enroll course error:', error);
    sendError(res, 'Failed to enroll in course', 500);
  }
};

export const getMyEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: {
        course: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    profileImage: true,
                  },
                },
              },
            },
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    sendSuccess(res, enrollments, 'Enrollments retrieved successfully');
  } catch (error) {
    console.error('Get enrollments error:', error);
    sendError(res, 'Failed to retrieve enrollments', 500);
  }
};

export const updateProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const { enrollmentId } = req.params;
    const { progress } = req.body;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      sendError(res, 'Enrollment not found', 404);
      return;
    }

    if (enrollment.studentId !== student.id) {
      sendError(res, 'Unauthorized to update this enrollment', 403);
      return;
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress,
        ...(progress === 100 && { completedAt: new Date() }),
      },
    });

    sendSuccess(res, updatedEnrollment, 'Progress updated successfully');
  } catch (error) {
    console.error('Update progress error:', error);
    sendError(res, 'Failed to update progress', 500);
  }
};

export const getEnrollmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const { courseId } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId,
        },
      },
    });

    const isEnrolled = !!enrollment;

    sendSuccess(res, {
      isEnrolled,
      enrollment: enrollment || undefined,
    }, 'Enrollment status retrieved successfully');
  } catch (error) {
    console.error('Get enrollment status error:', error);
    sendError(res, 'Failed to get enrollment status', 500);
  }
};

export const completeEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const { enrollmentId } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      sendError(res, 'Enrollment not found', 404);
      return;
    }

    if (enrollment.studentId !== student.id) {
      sendError(res, 'Unauthorized to complete this enrollment', 403);
      return;
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress: 100,
        completedAt: new Date(),
      },
    });

    sendSuccess(res, updatedEnrollment, 'Enrollment completed successfully');
  } catch (error) {
    console.error('Complete enrollment error:', error);
    sendError(res, 'Failed to complete enrollment', 500);
  }
};
