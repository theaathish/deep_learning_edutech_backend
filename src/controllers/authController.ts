import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email';
import crypto from 'crypto';

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

    // Send welcome email (don't block if it fails)
    try {
      await sendWelcomeEmail(user.email, user.firstName);
    } catch (emailError) {
      // Log but don't block registration
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send welcome email:', emailError);
      }
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

export const forgotPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security, don't reveal if email exists or not
      sendSuccess(res, null, 'If an account exists with this email, a password reset link will be sent');
      return;
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    await prisma.passwordReset.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Create reset link (frontend should handle this URL)
    const resetLink = `${process.env.API_URL}/api/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    // Send email (don't block if it fails)
    try {
      await sendPasswordResetEmail(user.email, user.firstName, resetLink);
    } catch (emailError) {
      // Log but don't block password reset
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send password reset email:', emailError);
      }
    }

    sendSuccess(res, null, 'If an account exists with this email, a password reset link will be sent');
  } catch (error) {
    console.error('Forgot password error:', error);
    sendError(res, 'Failed to process password reset request', 500);
  }
};

export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      sendError(res, 'Token, email, and new password are required', 400);
      return;
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user and verify reset token
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        passwordResets: {
          where: {
            token: tokenHash,
            isUsed: false,
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!user || user.passwordResets.length === 0) {
      sendError(res, 'Invalid or expired password reset token', 400);
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and mark token as used
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { id: user.passwordResets[0].id },
        data: { isUsed: true },
      }),
      // Delete all other unused reset tokens for this user
      prisma.passwordReset.deleteMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
      }),
    ]);

    sendSuccess(res, null, 'Password reset successfully. You can now login with your new password');
  } catch (error) {
    console.error('Reset password error:', error);
    sendError(res, 'Failed to reset password', 500);
  }
};
