import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as sleepController from '../../controllers/sleep.controller';
import * as s3Utils from '../../utils/s3';
import * as encryptionUtils from '../../utils/encryption';
import axios from 'axios';

const prisma = new PrismaClient();

describe('Sleep Controller', () => {
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

  describe('startSleepSession', () => {
    it('should start a new sleep session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        startTime: new Date(),
        status: 'IN_PROGRESS',
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        body: {
          timezone: 'America/New_York',
          deviceInfo: { model: 'iPhone 14', os: 'iOS 17' },
        },
      } as any;

      (prisma.sleepSession.create as jest.Mock).mockResolvedValue(mockSession);

      await sleepController.startSleepSession(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSession,
        })
      );
    });

    it('should return 400 if timezone is missing', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        body: {},
      } as any;

      await sleepController.startSleepSession(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('uploadAudioChunk', () => {
    it('should upload audio chunk successfully', async () => {
      const mockAudioChunk = {
        id: 'chunk-123',
        sessionId: 'session-123',
        chunkNumber: 1,
        s3Key: 'test-key',
        uploadedAt: new Date(),
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'session-123' },
        body: {
          chunkNumber: 1,
          chunkData: Buffer.from('test-audio').toString('base64'),
          duration: 300,
        },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        status: 'IN_PROGRESS',
      });
      (prisma.audioChunk.create as jest.Mock).mockResolvedValue(mockAudioChunk);

      await sleepController.uploadAudioChunk(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(s3Utils.uploadToS3).toHaveBeenCalled();
      expect(encryptionUtils.encryptAudio).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockAudioChunk,
        })
      );
    });

    it('should return 404 if session not found', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'nonexistent-session' },
        body: {
          chunkNumber: 1,
          chunkData: Buffer.from('test-audio').toString('base64'),
        },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue(null);

      await sleepController.uploadAudioChunk(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if session belongs to another user', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'session-456' },
        body: {
          chunkNumber: 1,
          chunkData: Buffer.from('test-audio').toString('base64'),
        },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-456',
        userId: 'different-user',
        status: 'IN_PROGRESS',
      });

      await sleepController.uploadAudioChunk(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('endSleepSession', () => {
    it('should end sleep session and trigger ML processing', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: null,
        status: 'IN_PROGRESS',
      };

      const mockUpdatedSession = {
        ...mockSession,
        endTime: new Date('2024-01-01T08:00:00Z'),
        status: 'PROCESSING',
        duration: 480,
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'session-123' },
        body: {
          endTime: '2024-01-01T08:00:00Z',
        },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.sleepSession.update as jest.Mock).mockResolvedValue(mockUpdatedSession);
      (prisma.audioChunk.findMany as jest.Mock).mockResolvedValue([
        { id: 'chunk-1', s3Key: 'key-1' },
        { id: 'chunk-2', s3Key: 'key-2' },
      ]);

      await sleepController.endSleepSession(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'PROCESSING',
          }),
        })
      );
    });

    it('should return 400 if session already ended', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'session-123' },
        body: {
          endTime: '2024-01-01T08:00:00Z',
        },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        status: 'COMPLETED',
        endTime: new Date(),
      });

      await sleepController.endSleepSession(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSleepSession', () => {
    it('should get sleep session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 480,
        qualityScore: 85,
        phases: [
          { phase: 'DEEP', duration: 120 },
          { phase: 'REM', duration: 180 },
        ],
        events: [
          { type: 'SNORING', timestamp: new Date(), confidence: 0.95 },
        ],
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'session-123' },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue(mockSession);

      await sleepController.getSleepSession(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSession,
        })
      );
    });

    it('should return 404 if session not found', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'nonexistent' },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue(null);

      await sleepController.getSleepSession(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getSleepHistory', () => {
    it('should get sleep history with pagination', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          startTime: new Date('2024-01-01'),
          qualityScore: 85,
        },
        {
          id: 'session-2',
          userId: 'user-123',
          startTime: new Date('2024-01-02'),
          qualityScore: 90,
        },
      ];

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        query: {
          limit: '10',
          offset: '0',
        },
      } as any;

      (prisma.sleepSession.findMany as jest.Mock).mockResolvedValue(mockSessions);

      await sleepController.getSleepHistory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSessions,
        })
      );
    });

    it('should filter by date range', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      } as any;

      (prisma.sleepSession.findMany as jest.Mock).mockResolvedValue([]);

      await sleepController.getSleepHistory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prisma.sleepSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe('deleteSleepSession', () => {
    it('should delete sleep session and associated data', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
      };

      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'session-123' },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.audioChunk.findMany as jest.Mock).mockResolvedValue([
        { s3Key: 'key-1' },
        { s3Key: 'key-2' },
      ]);
      (prisma.sleepSession.delete as jest.Mock).mockResolvedValue(mockSession);

      await sleepController.deleteSleepSession(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(s3Utils.deleteFromS3).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Sleep session deleted successfully',
        })
      );
    });

    it('should return 403 for unauthorized delete', async () => {
      mockRequest = {
        ...mockRequest,
        user: { userId: 'user-123' },
        params: { sessionId: 'session-456' },
      } as any;

      (prisma.sleepSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-456',
        userId: 'different-user',
      });

      await sleepController.deleteSleepSession(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});
