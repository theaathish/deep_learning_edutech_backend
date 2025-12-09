import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { hashPassword } from '../utils/password';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec); }

// ============ ADMIN LOGIN ============
// ============ ADMIN LOGIN ============
export const adminLogin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      sendError(res, 'Email and password are required', 400); }
      return;
    }

    // Check email matches admin email
    if (email !== process.env.ADMIN_EMAIL) {
      sendError(res, 'Invalid admin credentials', 401); }
      return;
    }

    // Find or create admin user
    let adminUser = await prisma.user.findFirst({
      where: { email: process.env.ADMIN_EMAIL, role: 'ADMIN' },
    }); }

    if (!adminUser) {
      const hashedPassword = await hashPassword(process.env.ADMIN_PASSWORD!); }
      adminUser = await prisma.user.create({
        data: {
          email: process.env.ADMIN_EMAIL!,
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
        },
      }); }
    } else {
      // Verify password hash for existing admin
      const passwordMatch = await (require('../utils/password')).comparePassword(
        password,
        adminUser.password
      ); }
      
      if (!passwordMatch) {
        sendError(res, 'Invalid admin credentials', 401); }
        return;
      }
    }

    // Generate token
    const { generateToken } = require('../utils/jwt'); }
    const token = generateToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    }); }

    sendSuccess(res, {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
      },
      token,
    }, 'Admin login successful'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      if (process.env.NODE_ENV !== 'production') { console.error('Admin login error:', error); }
    }
    sendError(res, 'Failed to login', 500); }
  }
};

// ============ DASHBOARD STATS ============
export const getDashboardStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalCourses,
      totalEnrollments,
      totalRevenue,
      pendingTeachers,
      recentPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.teacher.count(),
      prisma.student.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.payment.aggregate({
        where: { status: 'succeeded' },
        _sum: { amount: true },
      }),
      prisma.teacher.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.payment.findMany({
        where: { status: 'succeeded' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          teacher: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      }),
    ]); }

    sendSuccess(res, {
      stats: {
        totalUsers,
        totalTeachers,
        totalStudents,
        totalCourses,
        totalEnrollments,
        totalRevenue: totalRevenue._sum.amount || 0,
        pendingTeachers,
      },
      recentPayments,
    }, 'Dashboard stats retrieved'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Get dashboard stats error:', error); }
    sendError(res, 'Failed to get dashboard stats', 500); }
  }
};

// ============ COURSE MANAGEMENT ============
export const getAllCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit); }

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
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
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
              modules: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]); }

    sendPaginated(res, courses, Number(page), Number(limit), total, 'Courses retrieved'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Get all courses error:', error); }
    sendError(res, 'Failed to get courses', 500); }
  }
};

export const updateCourseByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Sanitize file URLs
    if (updateData.thumbnailImage) {
      updateData.thumbnailImage = updateData.thumbnailImage.replace(/^.*\/uploads\//, ''); }
    }
    if (updateData.videoUrl) {
      updateData.videoUrl = updateData.videoUrl.replace(/^.*\/uploads\//, ''); }
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
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
    }); }

    sendSuccess(res, course, 'Course updated successfully'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Update course error:', error); }
    sendError(res, 'Failed to update course', 500); }
  }
};

export const deleteCourseByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Delete course (cascades to modules, lessons, enrollments, reviews)
    await prisma.course.delete({
      where: { id },
    }); }

    sendSuccess(res, null, 'Course deleted successfully'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Delete course error:', error); }
    sendError(res, 'Failed to delete course', 500); }
  }
};

export const toggleCoursePublish = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id } }); }
    if (!course) {
      sendError(res, 'Course not found', 404); }
      return;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { isPublished: !course.isPublished },
    }); }

    sendSuccess(res, updated, `Course ${updated.isPublished ? 'published' : 'unpublished'}`); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Toggle publish error:', error); }
    sendError(res, 'Failed to toggle publish status', 500); }
  }
};

// ============ TEACHER MANAGEMENT ============
export const getAllTeachers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit); }

    const where: any = {};
    if (status) {
      where.verificationStatus = status;
    }
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              profileImage: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              courses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count({ where }),
    ]); }

    sendPaginated(res, teachers, Number(page), Number(limit), total, 'Teachers retrieved'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Get all teachers error:', error); }
    sendError(res, 'Failed to get teachers', 500); }
  }
};

export const verifyTeacher = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { verificationStatus } = req.body; // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(verificationStatus)) {
      sendError(res, 'Invalid verification status', 400); }
      return;
    }

    const teacher = await prisma.teacher.update({
      where: { id },
      data: { verificationStatus },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }); }

    sendSuccess(res, teacher, `Teacher ${verificationStatus.toLowerCase()}`); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Verify teacher error:', error); }
    sendError(res, 'Failed to verify teacher', 500); }
  }
};

export const updateTeacherByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { bio, expertise, experience, education, verificationStatus } = req.body;

    const updateData: any = {};
    if (bio !== undefined) updateData.bio = bio;
    if (expertise !== undefined) updateData.expertise = expertise;
    if (experience !== undefined) updateData.experience = experience;
    if (education !== undefined) updateData.education = education;
    if (verificationStatus !== undefined) updateData.verificationStatus = verificationStatus;

    const teacher = await prisma.teacher.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }); }

    sendSuccess(res, teacher, 'Teacher updated successfully'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Update teacher error:', error); }
    sendError(res, 'Failed to update teacher', 500); }
  }
};

export const deleteTeacherByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    }); }

    if (!teacher) {
      sendError(res, 'Teacher not found', 404); }
      return;
    }

    // Delete teacher profile (cascades to courses, etc.)
    await prisma.teacher.delete({ where: { id } }); }

    // Delete user account
    await prisma.user.delete({ where: { id: teacher.userId } }); }

    sendSuccess(res, null, 'Teacher deleted successfully'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Delete teacher error:', error); }
    sendError(res, 'Failed to delete teacher', 500); }
  }
};

// ============ STUDENT MANAGEMENT ============
export const getAllStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit); }

    const where: any = {};
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              profileImage: true,
              createdAt: true,
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
      prisma.student.count({ where }),
    ]); }

    sendPaginated(res, students, Number(page), Number(limit), total, 'Students retrieved'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Get all students error:', error); }
    sendError(res, 'Failed to get students', 500); }
  }
};

export const updateStudentByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { interests, goals } = req.body;

    const updateData: any = {};
    if (interests !== undefined) updateData.interests = interests;
    if (goals !== undefined) updateData.goals = goals;

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }); }

    sendSuccess(res, student, 'Student updated successfully'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Update student error:', error); }
    sendError(res, 'Failed to update student', 500); }
  }
};

export const deleteStudentByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    }); }

    if (!student) {
      sendError(res, 'Student not found', 404); }
      return;
    }

    // Delete student profile (cascades to enrollments, reviews, etc.)
    await prisma.student.delete({ where: { id } }); }

    // Delete user account
    await prisma.user.delete({ where: { id: student.userId } }); }

    sendSuccess(res, null, 'Student deleted successfully'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Delete student error:', error); }
    sendError(res, 'Failed to delete student', 500); }
  }
};

// ============ SYSTEM MONITORING ============
export const getSystemStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // CPU and Memory info
    const cpus = os.cpus(); }
    const totalMemory = os.totalmem(); }
    const freeMemory = os.freemem(); }
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2); }

    // Uptime
    const uptime = os.uptime(); }

    // Load average (1, 5, 15 minutes)
    const loadAverage = os.loadavg(); }

    // Platform info
    const platform = os.platform(); }
    const hostname = os.hostname(); }
    const osType = os.type(); }
    const osRelease = os.release(); }

    // Disk usage (for Unix-like systems)
    let diskStats: any = null;
    try {
      if (platform === 'linux' || platform === 'darwin') {
        const { stdout } = await execAsync('df -h / | tail -1'); }
        const parts = stdout.trim().split(/\s+/); }
        diskStats = {
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          usePercent: parts[4],
          mountedOn: parts[5],
        };
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') { console.error('Failed to get disk stats:', err); }
    }

    // Uploads directory size
    const uploadsPath = path.join(process.cwd(), 'uploads'); }
    let uploadsDirSize = 0;
    try {
      const getDirectorySize = async (dir: string): Promise<number> => {
        let size = 0;
        const files = fs.readdirSync(dir); }
        for (const file of files) {
          const filePath = path.join(dir, file); }
          const stats = fs.statSync(filePath); }
          if (stats.isDirectory()) {
            size += await getDirectorySize(filePath); }
          } else {
            size += stats.size;
          }
        }
        return size;
      };
      uploadsDirSize = await getDirectorySize(uploadsPath); }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') { console.error('Failed to get uploads directory size:', err); }
    }

    // Format bytes to human readable
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k)); }
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    sendSuccess(res, {
      system: {
        platform,
        hostname,
        osType,
        osRelease,
        uptime: {
          seconds: uptime,
          formatted: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        },
      },
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0,
      },
      memory: {
        total: formatBytes(totalMemory),
        used: formatBytes(usedMemory),
        free: formatBytes(freeMemory),
        usagePercent: parseFloat(memoryUsagePercent),
      },
      load: {
        '1min': loadAverage[0]?.toFixed(2) || 0,
        '5min': loadAverage[1]?.toFixed(2) || 0,
        '15min': loadAverage[2]?.toFixed(2) || 0,
      },
      disk: diskStats,
      storage: {
        uploadsDir: uploadsPath,
        uploadsSize: formatBytes(uploadsDirSize),
        uploadsSizeBytes: uploadsDirSize,
      },
    }, 'System stats retrieved'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Get system stats error:', error); }
    sendError(res, 'Failed to get system stats', 500); }
  }
};

// ============ PAYMENT MANAGEMENT ============
export const getAllPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, purpose } = req.query;
    const skip = (Number(page) - 1) * Number(limit); }

    const where: any = {};
    if (status) where.status = status;
    if (purpose) where.purpose = purpose;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          student: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          teacher: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]); }

    sendPaginated(res, payments, Number(page), Number(limit), total, 'Payments retrieved'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Get all payments error:', error); }
    sendError(res, 'Failed to get payments', 500); }
  }
};

// ============ USER MANAGEMENT ============
export const updateUserByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phoneNumber, role } = req.body;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (role) updateData.role = role;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        profileImage: true,
        createdAt: true,
      },
    }); }

    sendSuccess(res, user, 'User updated successfully'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Update user error:', error); }
    sendError(res, 'Failed to update user', 500); }
  }
};

export const deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Delete payment record
    await prisma.payment.delete({
      where: { id },
    }); }

    sendSuccess(res, null, 'Payment record deleted successfully'); }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('Delete payment error:', error); }
    sendError(res, 'Failed to delete payment', 500); }
  }
};
