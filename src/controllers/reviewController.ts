import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { courseId, teacherId, rating, comment } = req.body;

    if (!courseId && !teacherId) {
      sendError(res, 'Either courseId or teacherId is required', 400);
      return;
    }

    if (rating < 1 || rating > 5) {
      sendError(res, 'Rating must be between 1 and 5', 400);
      return;
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        studentId: student.id,
        ...(courseId && { courseId }),
        ...(teacherId && { teacherId }),
      },
    });

    if (existingReview) {
      sendError(res, 'You have already reviewed this', 400);
      return;
    }

    const review = await prisma.review.create({
      data: {
        studentId: student.id,
        courseId: courseId || null,
        teacherId: teacherId || null,
        rating,
        comment,
      },
      include: {
        student: {
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
      },
    });

    // Update course or teacher rating
    if (courseId) {
      const courseReviews = await prisma.review.findMany({
        where: { courseId },
      });
      const avgRating =
        courseReviews.reduce((acc, r) => acc + r.rating, 0) / courseReviews.length;
      await prisma.course.update({
        where: { id: courseId },
        data: { rating: avgRating },
      });
    }

    if (teacherId) {
      const teacherReviews = await prisma.review.findMany({
        where: { teacherId },
      });
      const avgRating =
        teacherReviews.reduce((acc, r) => acc + r.rating, 0) / teacherReviews.length;
      await prisma.teacher.update({
        where: { id: teacherId },
        data: {
          rating: avgRating,
          totalReviews: teacherReviews.length,
        },
      });
    }

    sendSuccess(res, review, 'Review created successfully', 201);
  } catch (error) {
    console.error('Create review error:', error);
    sendError(res, 'Failed to create review', 500);
  }
};

export const getReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId, teacherId, page = 1, limit = 10 } = req.query;

    if (!courseId && !teacherId) {
      sendError(res, 'Either courseId or teacherId is required', 400);
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (courseId) where.courseId = courseId as string;
    if (teacherId) where.teacherId = teacherId as string;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          student: {
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
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    sendPaginated(res, reviews, Number(page), Number(limit), total, 'Reviews retrieved successfully');
  } catch (error) {
    console.error('Get reviews error:', error);
    sendError(res, 'Failed to retrieve reviews', 500);
  }
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      sendError(res, 'Review not found', 404);
      return;
    }

    if (review.studentId !== student.id) {
      sendError(res, 'Not authorized to update this review', 403);
      return;
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        ...(rating && { rating }),
        ...(comment !== undefined && { comment }),
      },
    });

    sendSuccess(res, updatedReview, 'Review updated successfully');
  } catch (error) {
    console.error('Update review error:', error);
    sendError(res, 'Failed to update review', 500);
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      sendError(res, 'Review not found', 404);
      return;
    }

    if (review.studentId !== student.id && req.user.role !== 'ADMIN') {
      sendError(res, 'Not authorized to delete this review', 403);
      return;
    }

    await prisma.review.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Review deleted successfully');
  } catch (error) {
    console.error('Delete review error:', error);
    sendError(res, 'Failed to delete review', 500);
  }
};
