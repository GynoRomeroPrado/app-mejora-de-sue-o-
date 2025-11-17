import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as familyController from '../../controllers/family.controller';
import * as emailUtils from '../../utils/email';
import * as tokenUtils from '../../utils/token';

const prisma = new PrismaClient();

describe('Family Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('createFamilyGroup', () => {
    it('should create a family group successfully', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Smith Family',
        adminId: 'user-123',
        createdAt: new Date(),
      };

      const mockMember = {
        id: 'member-123',
        familyGroupId: 'group-123',
        userId: 'user-123',
        role: 'ADMIN',
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        body: {
          name: 'Smith Family',
        },
      } as any;

      (prisma.familyGroup.create as jest.Mock).mockResolvedValue(mockGroup);
      (prisma.familyMember.create as jest.Mock).mockResolvedValue(mockMember);

      await familyController.createFamilyGroup(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockGroup,
        })
      );
    });

    it('should return 400 if name is missing', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        body: {},
      } as any;

      await familyController.createFamilyGroup(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('inviteMember', () => {
    it('should send invitation email successfully', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Smith Family',
        adminId: 'user-123',
      };

      const mockInvitation = {
        id: 'invitation-123',
        familyGroupId: 'group-123',
        email: 'newmember@example.com',
        token: 'mock-token-123',
        invitedBy: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { groupId: 'group-123' },
        body: {
          email: 'newmember@example.com',
        },
      } as any;

      (prisma.familyGroup.findUnique as jest.Mock).mockResolvedValue(mockGroup);
      (prisma.familyGroupInvitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      await familyController.inviteMember(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(emailUtils.sendEmail).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Invitation sent successfully',
        })
      );
    });

    it('should return 403 if user is not admin', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-456' },
        params: { groupId: 'group-123' },
        body: {
          email: 'newmember@example.com',
        },
      } as any;

      (prisma.familyGroup.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-123',
        adminId: 'user-123',
      });

      await familyController.inviteMember(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if group not found', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { groupId: 'nonexistent' },
        body: {
          email: 'newmember@example.com',
        },
      } as any;

      (prisma.familyGroup.findUnique as jest.Mock).mockResolvedValue(null);

      await familyController.inviteMember(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        familyGroupId: 'group-123',
        email: 'newmember@example.com',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 1000000),
      };

      const mockMember = {
        id: 'member-123',
        familyGroupId: 'group-123',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-456', email: 'newmember@example.com' },
        params: { token: 'valid-token' },
      } as any;

      (prisma.familyGroupInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);
      (prisma.familyMember.create as jest.Mock).mockResolvedValue(mockMember);
      (prisma.familyGroupInvitation.delete as jest.Mock).mockResolvedValue(mockInvitation);

      await familyController.acceptInvitation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Invitation accepted successfully',
        })
      );
    });

    it('should return 404 for invalid token', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-456' },
        params: { token: 'invalid-token' },
      } as any;

      (prisma.familyGroupInvitation.findUnique as jest.Mock).mockResolvedValue(null);

      await familyController.acceptInvitation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for expired invitation', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-456', email: 'newmember@example.com' },
        params: { token: 'expired-token' },
      } as any;

      (prisma.familyGroupInvitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'invitation-123',
        email: 'newmember@example.com',
        expiresAt: new Date(Date.now() - 1000000),
      });

      await familyController.acceptInvitation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for email mismatch', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-456', email: 'wrong@example.com' },
        params: { token: 'valid-token' },
      } as any;

      (prisma.familyGroupInvitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'invitation-123',
        email: 'correct@example.com',
        expiresAt: new Date(Date.now() + 1000000),
      });

      await familyController.acceptInvitation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getFamilyGroup', () => {
    it('should get family group with members', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Smith Family',
        adminId: 'user-123',
        members: [
          {
            id: 'member-1',
            userId: 'user-123',
            role: 'ADMIN',
            user: { name: 'John', email: 'john@example.com' },
          },
          {
            id: 'member-2',
            userId: 'user-456',
            role: 'MEMBER',
            user: { name: 'Jane', email: 'jane@example.com' },
          },
        ],
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { groupId: 'group-123' },
      } as any;

      (prisma.familyMember.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-123',
      });
      (prisma.familyGroup.findUnique as jest.Mock).mockResolvedValue(mockGroup);

      await familyController.getFamilyGroup(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockGroup,
        })
      );
    });

    it('should return 403 if user is not a member', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-999' },
        params: { groupId: 'group-123' },
      } as any;

      (prisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null);

      await familyController.getFamilyGroup(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: {
          groupId: 'group-123',
          memberId: 'member-456',
        },
      } as any;

      (prisma.familyGroup.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-123',
        adminId: 'user-123',
      });
      (prisma.familyMember.delete as jest.Mock).mockResolvedValue({});

      await familyController.removeMember(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Member removed successfully',
        })
      );
    });

    it('should return 403 if user is not admin', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-456' },
        params: {
          groupId: 'group-123',
          memberId: 'member-789',
        },
      } as any;

      (prisma.familyGroup.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-123',
        adminId: 'user-123',
      });

      await familyController.removeMember(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('leaveFamilyGroup', () => {
    it('should allow member to leave group', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-456' },
        params: { groupId: 'group-123' },
      } as any;

      (prisma.familyGroup.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-123',
        adminId: 'user-123',
      });
      (prisma.familyMember.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await familyController.leaveFamilyGroup(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Left family group successfully',
        })
      );
    });

    it('should return 400 if admin tries to leave', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { groupId: 'group-123' },
      } as any;

      (prisma.familyGroup.findUnique as jest.Mock).mockResolvedValue({
        id: 'group-123',
        adminId: 'user-123',
      });

      await familyController.leaveFamilyGroup(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getGroupStats', () => {
    it('should return group statistics', async () => {
      const mockMembers = [
        { userId: 'user-1', user: { name: 'John' } },
        { userId: 'user-2', user: { name: 'Jane' } },
      ];

      const mockSessions = [
        {
          userId: 'user-1',
          startTime: new Date('2024-01-01'),
          qualityScore: 85,
          duration: 480,
        },
        {
          userId: 'user-2',
          startTime: new Date('2024-01-02'),
          qualityScore: 90,
          duration: 420,
        },
      ];

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { groupId: 'group-123' },
      } as any;

      (prisma.familyMember.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-123',
      });
      (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(mockMembers);
      (prisma.sleepSession.findMany as jest.Mock).mockResolvedValue(mockSessions);

      await familyController.getGroupStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            memberStats: expect.any(Array),
            weeklyTrend: expect.any(Array),
          }),
        })
      );
    });
  });
});
