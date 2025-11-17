import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.userId,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Determine error code
  const errorCode = err.code || 'INTERNAL_ERROR';

  // Determine error message
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred'
      : err.message;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  });
};

/**
 * Handle async errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error
 */
export class AppError extends Error implements ApiError {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error creators
 */
export const NotFoundError = (message: string = 'Resource not found') =>
  new AppError(message, 404, 'NOT_FOUND');

export const ValidationError = (message: string, details?: any) =>
  new AppError(message, 400, 'VALIDATION_ERROR', details);

export const UnauthorizedError = (message: string = 'Unauthorized') =>
  new AppError(message, 401, 'UNAUTHORIZED');

export const ForbiddenError = (message: string = 'Forbidden') =>
  new AppError(message, 403, 'FORBIDDEN');

export const ConflictError = (message: string = 'Resource already exists') =>
  new AppError(message, 409, 'CONFLICT');

export const TooManyRequestsError = (message: string = 'Too many requests') =>
  new AppError(message, 429, 'TOO_MANY_REQUESTS');

export const InternalServerError = (message: string = 'Internal server error') =>
  new AppError(message, 500, 'INTERNAL_ERROR');
