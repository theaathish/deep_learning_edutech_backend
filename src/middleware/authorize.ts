import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../types';
import { sendError } from '../utils/response';

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'You do not have permission to perform this action', 403);
      return;
    }

    next();
  };
};
