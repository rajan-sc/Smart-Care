export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, any>,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: Record<string, any>) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(
    message: string = 'Unauthorized',
    code = 'UNAUTHORIZED',
    details?: Record<string, any>,
  ) {
    return new AppError(message, 401, code, details);
  }

  static forbidden(
    message: string = 'Forbidden',
    code = 'FORBIDDEN',
    details?: Record<string, any>,
  ) {
    return new AppError(message, 403, code, details);
  }

  static notFound(
    message: string = 'Resource not found',
    code = 'NOT_FOUND',
    details?: Record<string, any>,
  ) {
    return new AppError(message, 404, code, details);
  }

  static conflict(message: string, code = 'CONFLICT', details?: Record<string, any>) {
    return new AppError(message, 409, code, details);
  }

  static unprocessable(
    message: string,
    code = 'UNPROCESSABLE_ENTITY',
    details?: Record<string, any>,
  ) {
    return new AppError(message, 422, code, details);
  }

  static internal(
    message: string = 'Internal Server Error',
    code = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, any>,
  ) {
    return new AppError(message, 500, code, details, false);
  }
}
