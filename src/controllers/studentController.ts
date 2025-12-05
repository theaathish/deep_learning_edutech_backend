import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const getStudentProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const student = await prisma.student.findUnique({
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
        enrollments: {
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
        },
        _count: {
          select: {
            enrollments: true,
            assignments: true,
            reviews: true,
          },
        },
      },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    sendSuccess(res, student, 'Student profile retrieved successfully');
  } catch (error) {
    console.error('Get student profile error:', error);
    sendError(res, 'Failed to retrieve student profile', 500);
  }
};

export const updateStudentProfile = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { grade, school, interests } = req.body;

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        ...(grade && { grade }),
        ...(school && { school }),
        ...(interests && { interests }),
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

    sendSuccess(res, updatedStudent, 'Student profile updated successfully');
  } catch (error) {
    console.error('Update student profile error:', error);
    sendError(res, 'Failed to update student profile', 500);
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const [
      totalEnrollments,
      completedCourses,
      inProgressCourses,
      totalAssignments,
    ] = await Promise.all([
      prisma.enrollment.count({
        where: { studentId: student.id },
      }),
      prisma.enrollment.count({
        where: {
          studentId: student.id,
          progress: 100,
        },
      }),
      prisma.enrollment.count({
        where: {
          studentId: student.id,
          progress: {
            gt: 0,
            lt: 100,
          },
        },
      }),
      prisma.assignment.count({
        where: { studentId: student.id },
      }),
    ]);

    const stats = {
      totalEnrollments,
      completedCourses,
      inProgressCourses,
      totalAssignments,
    };

    sendSuccess(res, stats, 'Dashboard stats retrieved successfully');
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    sendError(res, 'Failed to retrieve dashboard stats', 500);
  }
};
