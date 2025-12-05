import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { sendWelcomeEmail } from '../utils/email';

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      sendError(res, 'Email already registered', 400);
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'STUDENT',
        phoneNumber,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Create role-specific profile
    if (user.role === 'TEACHER') {
      await prisma.teacher.create({
        data: {
          userId: user.id,
          specialization: [],
        },
      });
    } else if (user.role === 'STUDENT') {
      await prisma.student.create({
        data: {
          userId: user.id,
          interests: [],
        },
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    sendSuccess(res, { user, token, refreshToken }, 'Registration successful', 201);
  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, 'Registration failed', 500);
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teacher: true,
        student: true,
      },
    });

    if (!user) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'Account is deactivated', 403);
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    sendSuccess(res, { user: userWithoutPassword, token, refreshToken }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Login failed', 500);
  }
};

export const refreshAccessToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      sendError(res, 'Refresh token required', 400);
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      sendError(res, 'Invalid or expired refresh token', 401);
      return;
    }

    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });

    sendSuccess(res, { token: newToken }, 'Token refreshed successfully');
  } catch (error) {
    console.error('Token refresh error:', error);
    sendError(res, 'Token refresh failed', 401);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    sendSuccess(res, null, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 'Logout failed', 500);
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
        profileImage: true,
        isVerified: true,
        createdAt: true,
        teacher: true,
        student: true,
      },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, user, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, 'Failed to retrieve profile', 500);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { firstName, lastName, phoneNumber, profileImage } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phoneNumber && { phoneNumber }),
        ...(profileImage && { profileImage }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
        profileImage: true,
      },
    });

    sendSuccess(res, user, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 'Failed to update profile', 500);
  }
};
