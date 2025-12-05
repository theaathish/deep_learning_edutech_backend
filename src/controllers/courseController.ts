import { Response } from 'express';
import { AuthRequest, CourseFilters } from '../types';
import prisma from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { CourseLevel } from '@prisma/client';

export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const {
      title,
      description,
      shortDescription,
      category,
      level,
      price,
      duration,
      thumbnailImage,
      videoUrl,
      syllabus,
    } = req.body;

    // Sanitize file URLs - if they contain the full domain/uploads path, extract just the relative path
    const sanitizedThumbnail = thumbnailImage?.replace(/^.*\/uploads\//, '') || undefined;
    const sanitizedVideoUrl = videoUrl?.replace(/^.*\/uploads\//, '') || undefined;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        shortDescription,
        teacherId: teacher.id,
        category,
        level: level || CourseLevel.BEGINNER,
        price: parseFloat(price),
        duration: parseInt(duration),
        thumbnailImage: sanitizedThumbnail,
        syllabus,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // If videoUrl is provided, create a default module and lesson
    if (sanitizedVideoUrl) {
      await prisma.module.create({
        data: {
          courseId: course.id,
          title: 'Main Content',
          description: 'Course main video content',
          order: 1,
          duration: parseInt(duration),
          lessons: {
            create: {
              title: title,
              content: description,
              videoUrl: sanitizedVideoUrl,
              order: 1,
              duration: parseInt(duration),
            },
          },
        },
      });
    }

    sendSuccess(res, course, 'Course created successfully', 201);
  } catch (error) {
    console.error('Create course error:', error);
    sendError(res, 'Failed to create course', 500);
  }
};

export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      level,
      minPrice,
      maxPrice,
      teacherId,
      search,
    }: CourseFilters = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { isPublished: true };

    if (category) where.category = category;
    if (level) where.level = level;
    if (teacherId) where.teacherId = teacherId;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice.toString());
      if (maxPrice) where.price.lte = parseFloat(maxPrice.toString());
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: Number(limit),
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
          _count: {
            select: {
              enrollments: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);

    sendPaginated(res, courses, Number(page), Number(limit), total, 'Courses retrieved successfully');
  } catch (error) {
    console.error('Get courses error:', error);
    sendError(res, 'Failed to retrieve courses', 500);
  }
};

export const getCourseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
        modules: {
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        reviews: {
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
          take: 10,
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          },
        },
      },
    });

    if (!course) {
      sendError(res, 'Course not found', 404);
      return;
    }

    sendSuccess(res, course, 'Course retrieved successfully');
  } catch (error) {
    console.error('Get course error:', error);
    sendError(res, 'Failed to retrieve course', 500);
  }
};

export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      sendError(res, 'Course not found', 404);
      return;
    }

    if (course.teacherId !== teacher.id && req.user.role !== 'ADMIN') {
      sendError(res, 'Not authorized to update this course', 403);
      return;
    }

    // Sanitize file URLs - if they contain the full domain/uploads path, extract just the relative path
    if (updateData.thumbnailImage && typeof updateData.thumbnailImage === 'string') {
      updateData.thumbnailImage = updateData.thumbnailImage.replace(/^.*\/uploads\//, '');
    }
    if (updateData.videoUrl && typeof updateData.videoUrl === 'string') {
      updateData.videoUrl = updateData.videoUrl.replace(/^.*\/uploads\//, '');
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: updateData,
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
    });

    sendSuccess(res, updatedCourse, 'Course updated successfully');
  } catch (error) {
    console.error('Update course error:', error);
    sendError(res, 'Failed to update course', 500);
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      sendError(res, 'Course not found', 404);
      return;
    }

    if (course.teacherId !== teacher.id && req.user.role !== 'ADMIN') {
      sendError(res, 'Not authorized to delete this course', 403);
      return;
    }

    await prisma.course.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Course deleted successfully');
  } catch (error) {
    console.error('Delete course error:', error);
    sendError(res, 'Failed to delete course', 500);
  }
};

export const publishCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      sendError(res, 'Course not found', 404);
      return;
    }

    if (course.teacherId !== teacher.id && req.user.role !== 'ADMIN') {
      sendError(res, 'Not authorized to publish this course', 403);
      return;
    }

    // Validate that course has required fields
    if (!course.title || !course.description || !course.category || course.price < 0) {
      sendError(res, 'Course must have title, description, category, and valid price', 400);
      return;
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: { isPublished: true },
    });

    sendSuccess(res, updatedCourse, 'Course published successfully');
  } catch (error) {
    console.error('Publish course error:', error);
    sendError(res, 'Failed to publish course', 500);
  }
};
