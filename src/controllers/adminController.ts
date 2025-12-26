import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

// Dashboard stats
export const getDashboardStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalStudents, totalTeachers, totalCourses, totalEnrollments, totalRevenue] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.payment.aggregate({
        where: { status: 'succeeded' },
        _sum: { amount: true },
      }),
    ]);

    sendSuccess(
      res,
      {
        totalStudents,
        totalTeachers,
        totalCourses,
        totalEnrollments,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
      'Dashboard stats retrieved'
    );
  } catch (error) {
    console.error('Dashboard stats error:', error);
    sendError(res, 'Failed to retrieve dashboard stats', 500);
  }
};

// Get all courses for admin
export const getAdminCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        include: {
          teacher: {
            select: {
              id: true,
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count(),
    ]);

    sendSuccess(
      res,
      {
        courses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Courses retrieved'
    );
  } catch (error) {
    console.error('Get courses error:', error);
    sendError(res, 'Failed to retrieve courses', 500);
  }
};

// Get all teachers for admin
export const getAdminTeachers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              isVerified: true,
              isActive: true,
              createdAt: true,
            },
          },
          courses: {
            select: { id: true, title: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count(),
    ]);

    sendSuccess(
      res,
      {
        teachers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Teachers retrieved'
    );
  } catch (error) {
    console.error('Get teachers error:', error);
    sendError(res, 'Failed to retrieve teachers', 500);
  }
};

// Get all students for admin
export const getAdminStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              isVerified: true,
              isActive: true,
              createdAt: true,
            },
          },
          enrollments: {
            select: { id: true, courseId: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count(),
    ]);

    sendSuccess(
      res,
      {
        students,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Students retrieved'
    );
  } catch (error) {
    console.error('Get students error:', error);
    sendError(res, 'Failed to retrieve students', 500);
  }
};

// Get all payments for admin
export const getAdminPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        include: {
          student: {
            select: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          teacher: {
            select: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count(),
    ]);

    sendSuccess(
      res,
      {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Payments retrieved'
    );
  } catch (error) {
    console.error('Get payments error:', error);
    sendError(res, 'Failed to retrieve payments', 500);
  }
};

// System stats
export const getSystemStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPayments,
      successfulPayments,
      failedPayments,
      averageRating,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'succeeded' } }),
      prisma.payment.count({ where: { status: 'failed' } }),
      prisma.review.aggregate({
        _avg: { rating: true },
      }),
    ]);

    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'succeeded' },
      _sum: { amount: true },
    });

    sendSuccess(
      res,
      {
        totalUsers,
        activeUsers,
        totalPayments,
        successfulPayments,
        failedPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
        averageRating: averageRating._avg.rating || 0,
      },
      'System stats retrieved'
    );
  } catch (error) {
    console.error('System stats error:', error);
    sendError(res, 'Failed to retrieve system stats', 500);
  }
};
