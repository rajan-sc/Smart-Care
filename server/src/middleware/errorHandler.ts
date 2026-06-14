import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/apiError.js';
import logger from '../utils/logger.js';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;
  let isOperational = false;

  // Handle AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  }
  // Handle Zod Validation Errors
  else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.reduce((acc: Record<string, string[]>, curr) => {
      const field = curr.path.join('.');
      if (!acc[field]) {
        acc[field] = [];
      }
      acc[field].push(curr.message);
      return acc;
    }, {});
    isOperational = true;
  }
  // Handle Prisma Known Request Errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    isOperational = true;
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT';
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      message = `Unique constraint failed on ${target}`;
      details = err.meta;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = (err.meta?.cause as string) || 'Record not found';
      details = err.meta;
    } else {
      statusCode = 400;
      code = `PRISMA_ERROR_${err.code}`;
      message = err.message;
      isOperational = false; // Treat other prisma codes as non-operational/system errors
    }
  }
  // Handle other Prisma Errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    code = 'DATABASE_VALIDATION_ERROR';
    message = `Database validation failed: ${err.message}`;
    isOperational = true;
  }

  // Determine severity and log
  const logPayload = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code,
    message,
    details,
  };

  if (isOperational && statusCode < 500) {
    logger.warn(logPayload, `Operational error: ${message}`);
  } else {
    logger.error({ ...logPayload, stack: err.stack }, `System error: ${err.message || message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  });
};
