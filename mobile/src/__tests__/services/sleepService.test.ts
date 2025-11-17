import api from '../../services/api.service';
import * as sleepService from '../../services/sleep.service';
import { SleepSession, SleepPhase } from '../../types';

// Mock the API service
jest.mock('../../services/api.service');

describe('Sleep Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('should start a new sleep session', async () => {
      const mockSession: SleepSession = {
        id: 'session-123',
        userId: 'user-123',
        startTime: new Date(),
        status: 'recording',
        phases: [],
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (api.post as jest.Mock).mockResolvedValue(mockSession);

      const result = await sleepService.startSession();

      expect(api.post).toHaveBeenCalledWith('/sleep/sessions/start');
      expect(result).toEqual(mockSession);
      expect(result.status).toBe('recording');
    });

    it('should handle errors when starting session', async () => {
      (api.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(sleepService.startSession()).rejects.toThrow('Network error');
    });
  });

  describe('stopSession', () => {
    it('should stop an active session', async () => {
      const sessionId = 'session-123';
      const mockSession: SleepSession = {
        id: sessionId,
        userId: 'user-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 480,
        sleepScore: 85,
        efficiency: 92,
        status: 'completed',
        phases: [],
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (api.post as jest.Mock).mockResolvedValue(mockSession);

      const result = await sleepService.stopSession(sessionId);

      expect(api.post).toHaveBeenCalledWith(`/sleep/sessions/${sessionId}/stop`);
      expect(result).toEqual(mockSession);
      expect(result.status).toBe('completed');
      expect(result.duration).toBe(480);
    });
  });

  describe('getSessions', () => {
    it('should fetch sleep sessions with pagination', async () => {
      const mockSessions: SleepSession[] = [
        {
          id: 'session-1',
          userId: 'user-123',
          startTime: new Date(),
          endTime: new Date(),
          duration: 450,
          sleepScore: 82,
          status: 'completed',
          phases: [],
          events: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'session-2',
          userId: 'user-123',
          startTime: new Date(),
          endTime: new Date(),
          duration: 420,
          sleepScore: 78,
          status: 'completed',
          phases: [],
          events: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (api.get as jest.Mock).mockResolvedValue({
        items: mockSessions,
        total: 2,
        page: 1,
        pageSize: 30,
        hasMore: false,
      });

      const result = await sleepService.getSessions(30, 0);

      expect(api.get).toHaveBeenCalledWith('/sleep/sessions?limit=30&offset=0');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
    });
  });

  describe('getSession', () => {
    it('should fetch a single sleep session', async () => {
      const sessionId = 'session-123';
      const mockSession: SleepSession = {
        id: sessionId,
        userId: 'user-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 480,
        sleepScore: 87,
        efficiency: 93,
        status: 'completed',
        phases: [
          {
            id: 'phase-1',
            sessionId,
            phase: SleepPhase.DEEP,
            startTime: new Date(),
            endTime: new Date(),
            duration: 120,
            confidence: 0.95,
          },
        ],
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (api.get as jest.Mock).mockResolvedValue(mockSession);

      const result = await sleepService.getSession(sessionId);

      expect(api.get).toHaveBeenCalledWith(`/sleep/sessions/${sessionId}`);
      expect(result).toEqual(mockSession);
      expect(result.phases).toHaveLength(1);
    });
  });

  describe('deleteSession', () => {
    it('should delete a sleep session', async () => {
      const sessionId = 'session-123';

      (api.delete as jest.Mock).mockResolvedValue(undefined);

      await sleepService.deleteSession(sessionId);

      expect(api.delete).toHaveBeenCalledWith(`/sleep/sessions/${sessionId}`);
    });
  });

  describe('uploadAudioChunk', () => {
    it('should upload audio chunk successfully', async () => {
      const sessionId = 'session-123';
      const chunkData = 'base64encodedaudiodata';
      const chunkIndex = 0;

      (api.post as jest.Mock).mockResolvedValue(undefined);

      await sleepService.uploadAudioChunk(sessionId, chunkData, chunkIndex);

      expect(api.post).toHaveBeenCalledWith(`/sleep/sessions/${sessionId}/audio`, {
        chunkData,
        chunkIndex,
      });
    });
  });

  describe('getAnalytics', () => {
    it('should fetch analytics for a given period', async () => {
      const mockAnalytics = {
        userId: 'user-123',
        period: 'week',
        averageSleepScore: 84,
        averageDuration: 445,
        averageEfficiency: 90,
        phaseDistribution: {
          AWAKE: 5,
          REM: 20,
          LIGHT: 50,
          DEEP: 25,
        },
        eventCounts: {
          snoring: 15,
          apnea: 2,
          movement: 8,
          awakening: 3,
        },
        trends: {
          sleepScore: [],
          duration: [],
          efficiency: [],
        },
        insights: [],
      };

      (api.get as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await sleepService.getAnalytics('week');

      expect(api.get).toHaveBeenCalledWith('/sleep/analytics?period=week');
      expect(result.averageSleepScore).toBe(84);
      expect(result.phaseDistribution.DEEP).toBe(25);
    });
  });
});
