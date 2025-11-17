import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SleepState, SleepSession, Analytics } from '@/types';
import * as sleepService from '@/services/sleep.service';

const initialState: SleepState = {
  currentSession: null,
  sessions: [],
  analytics: null,
  isRecording: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const startSleepSession = createAsyncThunk(
  'sleep/startSession',
  async (_, { rejectWithValue }) => {
    try {
      const session = await sleepService.startSession();
      return session;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to start sleep session');
    }
  }
);

export const stopSleepSession = createAsyncThunk(
  'sleep/stopSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const session = await sleepService.stopSession(sessionId);
      return session;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to stop sleep session');
    }
  }
);

export const fetchSleepSessions = createAsyncThunk(
  'sleep/fetchSessions',
  async ({ limit = 30, offset = 0 }: { limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const sessions = await sleepService.getSessions(limit, offset);
      return sessions;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch sleep sessions');
    }
  }
);

export const fetchSleepSession = createAsyncThunk(
  'sleep/fetchSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const session = await sleepService.getSession(sessionId);
      return session;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch sleep session');
    }
  }
);

export const fetchAnalytics = createAsyncThunk(
  'sleep/fetchAnalytics',
  async (period: 'week' | 'month' | 'year', { rejectWithValue }) => {
    try {
      const analytics = await sleepService.getAnalytics(period);
      return analytics;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

export const uploadAudioChunk = createAsyncThunk(
  'sleep/uploadChunk',
  async (
    { sessionId, chunkData, chunkIndex }: { sessionId: string; chunkData: string; chunkIndex: number },
    { rejectWithValue }
  ) => {
    try {
      await sleepService.uploadAudioChunk(sessionId, chunkData, chunkIndex);
      return { sessionId, chunkIndex };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload audio chunk');
    }
  }
);

export const deleteSleepSession = createAsyncThunk(
  'sleep/deleteSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      await sleepService.deleteSession(sessionId);
      return sessionId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete session');
    }
  }
);

// Slice
const sleepSlice = createSlice({
  name: 'sleep',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    updateCurrentSession: (state, action: PayloadAction<Partial<SleepSession>>) => {
      if (state.currentSession) {
        state.currentSession = { ...state.currentSession, ...action.payload };
      }
    },
    clearCurrentSession: (state) => {
      state.currentSession = null;
      state.isRecording = false;
    },
    addLocalSession: (state, action: PayloadAction<SleepSession>) => {
      state.sessions.unshift(action.payload);
    },
    updateSession: (state, action: PayloadAction<{ id: string; updates: Partial<SleepSession> }>) => {
      const index = state.sessions.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.sessions[index] = { ...state.sessions[index], ...action.payload.updates };
      }
    },
  },
  extraReducers: (builder) => {
    // Start session
    builder
      .addCase(startSleepSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startSleepSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSession = action.payload;
        state.isRecording = true;
      })
      .addCase(startSleepSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Stop session
    builder
      .addCase(stopSleepSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(stopSleepSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSession = action.payload;
        state.isRecording = false;
        // Add to sessions list
        const exists = state.sessions.find((s) => s.id === action.payload.id);
        if (!exists) {
          state.sessions.unshift(action.payload);
        }
      })
      .addCase(stopSleepSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch sessions
    builder
      .addCase(fetchSleepSessions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSleepSessions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessions = action.payload;
      })
      .addCase(fetchSleepSessions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single session
    builder
      .addCase(fetchSleepSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSleepSession.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update in sessions list
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.sessions[index] = action.payload;
        } else {
          state.sessions.unshift(action.payload);
        }
      })
      .addCase(fetchSleepSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch analytics
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Upload audio chunk
    builder
      .addCase(uploadAudioChunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete session
    builder
      .addCase(deleteSleepSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSleepSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      })
      .addCase(deleteSleepSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setRecording,
  updateCurrentSession,
  clearCurrentSession,
  addLocalSession,
  updateSession,
} = sleepSlice.actions;

export default sleepSlice.reducer;
