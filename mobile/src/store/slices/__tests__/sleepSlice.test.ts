import sleepReducer, {
  startSession,
  endSession,
  fetchSessions,
  setCurrentSession,
} from '../sleepSlice';
import * as sleepService from '../../../services/sleep.service';

// Mock dependencies
jest.mock('../../../services/sleep.service');

describe('sleepSlice', () => {
  const initialState = {
    sessions: [],
    currentSession: null,
    isRecording: false,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(sleepReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle setCurrentSession', () => {
      const session = {
        id: 'session-123',
        startTime: new Date(),
        status: 'IN_PROGRESS',
      };

      const state = sleepReducer(
        initialState,
        setCurrentSession(session as any)
      );

      expect(state.currentSession).toEqual(session);
      expect(state.isRecording).toBe(true);
    });
  });

  describe('startSession async thunk', () => {
    it('should start a sleep session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        startTime: new Date().toISOString(),
        status: 'IN_PROGRESS',
      };

      (sleepService.startSleepSession as jest.Mock).mockResolvedValue(mockSession);

      const action = await startSession({
        timezone: 'America/New_York',
        deviceInfo: { model: 'iPhone', os: 'iOS' },
      });

      const state = sleepReducer(initialState, action);

      expect(state.currentSession).toBeTruthy();
      expect(state.isRecording).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle start session failure', async () => {
      (sleepService.startSleepSession as jest.Mock).mockRejectedValue(
        new Error('Failed to start session')
      );

      const action = await startSession({
        timezone: 'America/New_York',
      });

      const state = sleepReducer(initialState, action);

      expect(state.currentSession).toBeNull();
      expect(state.isRecording).toBe(false);
      expect(state.error).toBeTruthy();
    });

    it('should set loading state during start', () => {
      const action = startSession.pending('requestId', {
        timezone: 'America/New_York',
      });

      const state = sleepReducer(initialState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('endSession async thunk', () => {
    it('should end a sleep session successfully', async () => {
      const currentState = {
        ...initialState,
        currentSession: {
          id: 'session-123',
          startTime: new Date(),
          status: 'IN_PROGRESS',
        },
        isRecording: true,
      };

      const mockEndedSession = {
        id: 'session-123',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'COMPLETED',
        duration: 480,
        qualityScore: 85,
      };

      (sleepService.endSleepSession as jest.Mock).mockResolvedValue(mockEndedSession);

      const action = await endSession('session-123');
      const state = sleepReducer(currentState, action);

      expect(state.currentSession).toBeNull();
      expect(state.isRecording).toBe(false);
      expect(state.sessions).toContainEqual(mockEndedSession);
    });

    it('should handle end session failure', async () => {
      const currentState = {
        ...initialState,
        currentSession: {
          id: 'session-123',
          startTime: new Date(),
          status: 'IN_PROGRESS',
        },
        isRecording: true,
      };

      (sleepService.endSleepSession as jest.Mock).mockRejectedValue(
        new Error('Failed to end session')
      );

      const action = await endSession('session-123');
      const state = sleepReducer(currentState, action);

      expect(state.error).toBeTruthy();
    });
  });

  describe('fetchSessions async thunk', () => {
    it('should fetch sleep sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 480,
          qualityScore: 85,
          status: 'COMPLETED',
        },
        {
          id: 'session-2',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 420,
          qualityScore: 90,
          status: 'COMPLETED',
        },
      ];

      (sleepService.getSleepHistory as jest.Mock).mockResolvedValue(mockSessions);

      const action = await fetchSessions();
      const state = sleepReducer(initialState, action);

      expect(state.sessions).toEqual(mockSessions);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetch sessions failure', async () => {
      (sleepService.getSleepHistory as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch sessions')
      );

      const action = await fetchSessions();
      const state = sleepReducer(initialState, action);

      expect(state.sessions).toEqual([]);
      expect(state.error).toBeTruthy();
    });

    it('should filter sessions by date range', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          startTime: '2024-01-01T00:00:00Z',
          status: 'COMPLETED',
        },
      ];

      (sleepService.getSleepHistory as jest.Mock).mockResolvedValue(mockSessions);

      await fetchSessions({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(sleepService.getSleepHistory).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle multiple session starts', () => {
      const session1 = {
        id: 'session-1',
        startTime: new Date(),
        status: 'IN_PROGRESS',
      };

      const session2 = {
        id: 'session-2',
        startTime: new Date(),
        status: 'IN_PROGRESS',
      };

      let state = sleepReducer(initialState, setCurrentSession(session1 as any));
      expect(state.currentSession?.id).toBe('session-1');

      state = sleepReducer(state, setCurrentSession(session2 as any));
      expect(state.currentSession?.id).toBe('session-2');
    });

    it('should handle ending non-existent session gracefully', async () => {
      (sleepService.endSleepSession as jest.Mock).mockRejectedValue(
        new Error('Session not found')
      );

      const action = await endSession('nonexistent-session');
      const state = sleepReducer(initialState, action);

      expect(state.error).toBeTruthy();
      expect(state.currentSession).toBeNull();
    });
  });
});
