import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    sleepSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    audioChunk: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    sleepPhase: {
      createMany: jest.fn(),
    },
    sleepEvent: {
      createMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock AWS S3
jest.mock('../utils/s3', () => ({
  uploadToS3: jest.fn().mockResolvedValue({ key: 'test-key', url: 'test-url' }),
  downloadFromS3: jest.fn().mockResolvedValue(Buffer.from('test-audio')),
  deleteFromS3: jest.fn().mockResolvedValue(true),
  generatePresignedUrl: jest.fn().mockResolvedValue('https://example.com/presigned'),
}));

// Mock encryption utilities
jest.mock('../utils/encryption', () => ({
  encryptAudio: jest.fn((buffer: Buffer) => Promise.resolve(buffer)),
  decryptAudio: jest.fn((buffer: Buffer) => Promise.resolve(buffer)),
  generateEncryptionKey: jest.fn(() => 'test-encryption-key'),
}));

// Mock ML service
jest.mock('axios', () => ({
  default: {
    post: jest.fn().mockResolvedValue({
      data: {
        phases: [
          { phase: 'DEEP', startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T02:00:00Z', duration: 120 },
          { phase: 'REM', startTime: '2024-01-01T02:00:00Z', endTime: '2024-01-01T04:00:00Z', duration: 120 },
        ],
        events: [
          { type: 'SNORING', timestamp: '2024-01-01T01:00:00Z', confidence: 0.95, severity: 'MODERATE' },
        ],
        qualityScore: 85,
        recommendations: ['Maintain regular sleep schedule'],
      },
    }),
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET = 'test-bucket';
process.env.ML_SERVICE_URL = 'http://localhost:8000';

// Global test timeout
jest.setTimeout(10000);

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
