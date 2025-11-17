import api from './api.service';
import { User } from '@/types';

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

interface RegisterResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  return api.post<LoginResponse>('/auth/login', { email, password });
};

export const register = async (
  email: string,
  password: string,
  name: string
): Promise<RegisterResponse> => {
  return api.post<RegisterResponse>('/auth/register', { email, password, name });
};

export const logout = async (): Promise<void> => {
  return api.post<void>('/auth/logout');
};

export const validateToken = async (token: string): Promise<User> => {
  return api.get<User>('/auth/validate');
};

export const refreshToken = async (refreshToken: string): Promise<{ token: string }> => {
  return api.post<{ token: string }>('/auth/refresh', { refreshToken });
};

export const updateProfile = async (updates: Partial<User>): Promise<User> => {
  return api.patch<User>('/auth/profile', updates);
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  return api.post<void>('/auth/change-password', { currentPassword, newPassword });
};

export const resetPassword = async (email: string): Promise<void> => {
  return api.post<void>('/auth/reset-password', { email });
};

export const verifyEmail = async (token: string): Promise<void> => {
  return api.post<void>('/auth/verify-email', { token });
};

export const deleteAccount = async (): Promise<void> => {
  return api.delete<void>('/auth/account');
};
