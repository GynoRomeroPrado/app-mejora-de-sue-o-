import api from './api.service';
import { SleepSession, Analytics, PaginatedResponse } from '@/types';

export const startSession = async (): Promise<SleepSession> => {
  return api.post<SleepSession>('/sleep/sessions/start');
};

export const stopSession = async (sessionId: string): Promise<SleepSession> => {
  return api.post<SleepSession>(`/sleep/sessions/${sessionId}/stop`);
};

export const getSessions = async (
  limit: number = 30,
  offset: number = 0
): Promise<SleepSession[]> => {
  const response = await api.get<PaginatedResponse<SleepSession>>(
    `/sleep/sessions?limit=${limit}&offset=${offset}`
  );
  return response.items;
};

export const getSession = async (sessionId: string): Promise<SleepSession> => {
  return api.get<SleepSession>(`/sleep/sessions/${sessionId}`);
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  return api.delete<void>(`/sleep/sessions/${sessionId}`);
};

export const uploadAudioChunk = async (
  sessionId: string,
  chunkData: string,
  chunkIndex: number
): Promise<void> => {
  return api.post<void>(`/sleep/sessions/${sessionId}/audio`, {
    chunkData,
    chunkIndex,
  });
};

export const getAnalytics = async (period: 'week' | 'month' | 'year'): Promise<Analytics> => {
  return api.get<Analytics>(`/sleep/analytics?period=${period}`);
};

export const getPredictions = async (sessionId: string): Promise<any> => {
  return api.get<any>(`/sleep/sessions/${sessionId}/predictions`);
};

export const getInsights = async (): Promise<any[]> => {
  return api.get<any[]>('/sleep/insights');
};

export const compareWithAverage = async (sessionId: string): Promise<any> => {
  return api.get<any>(`/sleep/sessions/${sessionId}/compare`);
};
