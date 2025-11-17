import api from './api.service';
import { Notification } from '@/types';

export const getNotifications = async (): Promise<Notification[]> => {
  return api.get<Notification[]>('/notifications');
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  return api.patch<void>(`/notifications/${notificationId}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
  return api.post<void>('/notifications/read-all');
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  return api.delete<void>(`/notifications/${notificationId}`);
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>('/notifications/unread-count');
  return response.count;
};

export const subscribeToNotifications = async (token: string): Promise<void> => {
  return api.post<void>('/notifications/subscribe', { token });
};

export const unsubscribeFromNotifications = async (): Promise<void> => {
  return api.post<void>('/notifications/unsubscribe');
};
