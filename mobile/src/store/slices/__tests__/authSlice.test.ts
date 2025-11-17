import authReducer, {
  login,
  register,
  logout,
  loadStoredAuth,
  refreshAccessToken,
} from '../authSlice';
import * as authService from '../../../services/auth.service';
import EncryptedStorage from 'react-native-encrypted-storage';

// Mock dependencies
jest.mock('../../../services/auth.service');
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('login async thunk', () => {
    it('should handle successful login', async () => {
      const mockResponse = {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'access-token',
        refreshToken: 'refresh-token',
      };

      (authService.login as jest.Mock).mockResolvedValue(mockResponse);

      const action = await login({
        email: 'test@example.com',
        password: 'password',
      });

      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockResponse.user);
      expect(state.token).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith('access_token', 'access-token');
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
    });

    it('should handle login failure', async () => {
      (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      const action = await login({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });

    it('should set loading state during login', () => {
      const action = login.pending('requestId', {
        email: 'test@example.com',
        password: 'password',
      });

      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('register async thunk', () => {
    it('should handle successful registration', async () => {
      const mockResponse = {
        user: {
          id: '123',
          email: 'newuser@example.com',
          name: 'New User',
        },
        token: 'access-token',
        refreshToken: 'refresh-token',
      };

      (authService.register as jest.Mock).mockResolvedValue(mockResponse);

      const action = await register({
        email: 'newuser@example.com',
        password: 'password',
        name: 'New User',
      });

      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockResponse.user);
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith('access_token', 'access-token');
    });

    it('should handle registration failure', async () => {
      (authService.register as jest.Mock).mockRejectedValue(new Error('Email already exists'));

      const action = await register({
        email: 'existing@example.com',
        password: 'password',
        name: 'User',
      });

      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe('logout async thunk', () => {
    it('should handle successful logout', async () => {
      const loggedInState = {
        ...initialState,
        user: { id: '123', email: 'test@example.com', name: 'Test' },
        token: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
      };

      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const action = await logout();
      const state = authReducer(loggedInState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('loadStoredAuth async thunk', () => {
    it('should load stored authentication successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      };

      (EncryptedStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'access_token') return Promise.resolve('stored-token');
        if (key === 'refresh_token') return Promise.resolve('stored-refresh');
        return Promise.resolve(null);
      });

      (authService.validateToken as jest.Mock).mockResolvedValue(mockUser);

      const action = await loadStoredAuth();
      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('stored-token');
    });

    it('should handle no stored token', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const action = await loadStoredAuth();
      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should clear invalid stored tokens', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue('invalid-token');
      (authService.validateToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await loadStoredAuth();

      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('refreshAccessToken async thunk', () => {
    it('should refresh access token successfully', async () => {
      const mockResponse = {
        token: 'new-access-token',
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue(mockResponse);

      const stateWithRefreshToken = {
        ...initialState,
        refreshToken: 'refresh-token',
      };

      const getState = () => ({ auth: stateWithRefreshToken });
      const dispatch = jest.fn();
      const thunk = refreshAccessToken();

      await thunk(dispatch, getState, undefined);

      expect(authService.refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith('access_token', 'new-access-token');
    });

    it('should fail without refresh token', async () => {
      const getState = () => ({ auth: initialState });
      const dispatch = jest.fn();
      const thunk = refreshAccessToken();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toContain('rejected');
    });
  });
});
