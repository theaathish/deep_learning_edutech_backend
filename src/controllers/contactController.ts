import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const submitContactMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      sendError(res, 'Name, email, and message are required', 400);
      return;
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject: subject || 'General Inquiry',
        message,
      },
    });

    sendSuccess(res, {
      id: contactMessage.id,
      createdAt: contactMessage.createdAt,
    }, 'Message sent successfully', 201);
  } catch (error) {
    console.error('Contact message error:', error);
    sendError(res, 'Failed to send message', 500);
  }
};

export const getContactMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, isRead } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });

    const total = await prisma.contactMessage.count({ where });

    sendSuccess(res, {
      messages,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, 'Messages retrieved successfully');
  } catch (error) {
    console.error('Get contact messages error:', error);
    sendError(res, 'Failed to retrieve messages', 500);
  }
};

export const markMessageAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });

    sendSuccess(res, message, 'Message marked as read');
  } catch (error) {
    console.error('Mark message as read error:', error);
    sendError(res, 'Failed to update message', 500);
  }
};