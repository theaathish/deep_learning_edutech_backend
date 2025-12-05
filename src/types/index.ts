import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface CourseFilters extends PaginationParams {
  category?: string;
  level?: string;
  minPrice?: number;
  maxPrice?: number;
  teacherId?: string;
  search?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
