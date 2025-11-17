import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole, SubscriptionTier } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Authenticate user from JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive',
        },
      });
    }

    // Attach user to request
    (req as any).user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        },
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        },
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
};

/**
 * Authorize based on user roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn(`Unauthorized access attempt by user ${user.userId} with role ${user.role}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
    }

    next();
  };
};

/**
 * Check subscription tier
 */
export const requireSubscription = (...allowedTiers: SubscriptionTier[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedTiers.includes(user.subscriptionTier)) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'This feature requires a premium subscription',
          details: {
            currentTier: user.subscriptionTier,
            requiredTiers: allowedTiers,
          },
        },
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionTier: true,
      },
    });

    if (user) {
      (req as any).user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      };
    }

    next();
  } catch (error) {
    // Silently fail and continue without user
    next();
  }
};

/**
 * Rate limiting per user
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return next();
    }

    const now = Date.now();
    const userKey = user.userId;
    const userRequests = requests.get(userKey);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userRequests.count >= maxRequests) {
      const resetIn = Math.ceil((userRequests.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again in ${resetIn} seconds.`,
        },
      });
    }

    userRequests.count++;
    next();
  };
};

/**
 * Verify email is verified
 */
export const requireEmailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });

    if (!user?.emailVerified) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address to access this feature',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Email verification check error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_CHECK_ERROR',
        message: 'Failed to verify email status',
      },
    });
  }
};

/**
 * Check if user owns the resource
 */
export const requireResourceOwnership = (resourceUserIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authenticatedUserId = (req as any).user?.userId;
    const resourceUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];

    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (authenticatedUserId !== resourceUserId) {
      logger.warn(
        `Unauthorized access attempt: User ${authenticatedUserId} tried to access resource owned by ${resourceUserId}`
      );
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
    }

    next();
  };
};

/**
 * API Key authentication (for machine-to-machine)
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required',
        },
      });
    }

    // In production, validate API key against database
    // For now, check against environment variable
    if (apiKey !== process.env.API_KEY_SECRET) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'API key authentication failed',
      },
    });
  }
};
