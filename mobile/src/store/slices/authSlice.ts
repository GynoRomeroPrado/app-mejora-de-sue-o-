import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '@/types';
import * as authService from '@/services/auth.service';
import EncryptedStorage from 'react-native-encrypted-storage';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      // Store tokens securely
      await EncryptedStorage.setItem('access_token', response.token);
      await EncryptedStorage.setItem('refresh_token', response.refreshToken);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    { email, password, name }: { email: string; password: string; name: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.register(email, password, name);
      await EncryptedStorage.setItem('access_token', response.token);
      await EncryptedStorage.setItem('refresh_token', response.refreshToken);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authService.logout();
    await EncryptedStorage.removeItem('access_token');
    await EncryptedStorage.removeItem('refresh_token');
  } catch (error: any) {
    return rejectWithValue(error.message || 'Logout failed');
  }
});

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async (_, { rejectWithValue }) => {
  try {
    const token = await EncryptedStorage.getItem('access_token');
    const refreshToken = await EncryptedStorage.getItem('refresh_token');

    if (!token) {
      throw new Error('No stored token');
    }

    // Validate token and get user data
    const user = await authService.validateToken(token);

    return { user, token, refreshToken };
  } catch (error: any) {
    await EncryptedStorage.removeItem('access_token');
    await EncryptedStorage.removeItem('refresh_token');
    return rejectWithValue(error.message || 'Failed to load stored auth');
  }
});

export const refreshAccessToken = createAsyncThunk(
  'auth/refresh',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.refreshToken;

      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await authService.refreshToken(refreshToken);
      await EncryptedStorage.setItem('access_token', response.token);

      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<User>, { rejectWithValue }) => {
    try {
      const user = await authService.updateProfile(updates);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Profile update failed');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        return initialState;
      })
      .addCase(logout.rejected, (state) => {
        return initialState;
      });

    // Load stored auth
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken || null;
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isLoading = false;
      });

    // Refresh token
    builder
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // Token refresh failed, logout user
        return initialState;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
