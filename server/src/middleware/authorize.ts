import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/apiError.js';

export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden('You do not have permission to access this resource');
    }

    next();
  };
};
