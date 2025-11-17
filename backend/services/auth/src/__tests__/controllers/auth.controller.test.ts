import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as authController from '../../controllers/auth.controller';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const prisma = new PrismaClient();

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        dateOfBirth: null,
        gender: null,
        role: 'USER',
        subscriptionTier: 'FREE',
        profileImage: null,
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: mockUser,
            token: expect.any(String),
            refreshToken: expect.any(String),
          }),
          message: 'User registered successfully',
        })
      );
    });

    it('should return 409 if user already exists', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'Password123',
        name: 'Existing User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '123',
        email: 'existing@example.com',
      });

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'USER_EXISTS',
          }),
        })
      );
    });

    it('should return 400 for invalid email', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'Password123',
        name: 'Test User',
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should return 400 for weak password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hashed_Password123',
        name: 'Test User',
        role: 'USER',
        subscriptionTier: 'FREE',
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      );
    });

    it('should return 401 for non-existent user', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_CREDENTIALS',
          }),
        })
      );
    });

    it('should return 401 for invalid password', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hashed_CorrectPassword',
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_CREDENTIALS',
          }),
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: '123' },
      } as any;

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await authController.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
      };

      mockRequest.body = {
        refreshToken: 'mock_token_{"userId":"123","email":"test@example.com"}',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
          }),
        })
      );
    });

    it('should return 400 if refresh token is missing', async () => {
      mockRequest.body = {};

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MISSING_TOKEN',
          }),
        })
      );
    });

    it('should return 401 for invalid refresh token', async () => {
      mockRequest.body = {
        refreshToken: 'invalid_token',
      };

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
          }),
        })
      );
    });

    it('should return 401 if user not found', async () => {
      mockRequest.body = {
        refreshToken: 'mock_token_{"userId":"123","email":"test@example.com"}',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'USER_NOT_FOUND',
          }),
        })
      );
    });
  });

  describe('validateToken', () => {
    it('should validate token and return user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        subscriptionTier: 'FREE',
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: '123' },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await authController.validateToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockUser,
        })
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hashed_OldPassword123',
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: '123' },
        body: {
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword456',
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await authController.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Password changed successfully',
        })
      );
    });

    it('should return 401 for incorrect current password', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hashed_CorrectPassword',
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: '123' },
        body: {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword456',
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await authController.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_PASSWORD',
          }),
        })
      );
    });

    it('should return 404 if user not found', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: '123' },
        body: {
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword456',
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await authController.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'USER_NOT_FOUND',
          }),
        })
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Updated Name',
        profileImage: 'https://example.com/image.jpg',
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: '123' },
        body: {
          name: 'Updated Name',
          profileImage: 'https://example.com/image.jpg',
        },
      } as any;

      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await authController.updateProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: updatedUser,
        })
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: '123' },
      } as any;

      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await authController.deleteAccount(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Account deleted successfully',
        })
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockRequest.body = {
        token: 'mock_token_{"userId":"123","purpose":"email_verification"}',
      };

      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await authController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Email verified successfully',
        })
      );
    });

    it('should return 400 for invalid token purpose', async () => {
      mockRequest.body = {
        token: 'mock_token_{"userId":"123","purpose":"wrong_purpose"}',
      };

      await authController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
          }),
        })
      );
    });
  });

  describe('resetPassword', () => {
    it('should handle password reset request', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '123',
        email: 'test@example.com',
      });

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        })
      );
    });

    it('should return success even for non-existent email', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        })
      );
    });
  });
});
