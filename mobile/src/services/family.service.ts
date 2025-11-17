import api from './api.service';
import { FamilyGroup, FamilyMember, FamilyPermissions, SleepSession } from '@/types';

export const getFamilyGroup = async (): Promise<FamilyGroup> => {
  return api.get<FamilyGroup>('/family/group');
};

export const createFamilyGroup = async (name: string): Promise<FamilyGroup> => {
  return api.post<FamilyGroup>('/family/group', { name });
};

export const updateFamilyGroup = async (groupId: string, name: string): Promise<FamilyGroup> => {
  return api.patch<FamilyGroup>(`/family/group/${groupId}`, { name });
};

export const deleteFamilyGroup = async (groupId: string): Promise<void> => {
  return api.delete<void>(`/family/group/${groupId}`);
};

export const addFamilyMember = async (
  email: string,
  permissions: FamilyPermissions
): Promise<FamilyMember> => {
  return api.post<FamilyMember>('/family/members', { email, permissions });
};

export const removeFamilyMember = async (userId: string): Promise<void> => {
  return api.delete<void>(`/family/members/${userId}`);
};

export const updateMemberPermissions = async (
  userId: string,
  permissions: FamilyPermissions
): Promise<FamilyMember> => {
  return api.patch<FamilyMember>(`/family/members/${userId}/permissions`, { permissions });
};

export const getMemberSessions = async (userId: string): Promise<SleepSession[]> => {
  return api.get<SleepSession[]>(`/family/members/${userId}/sessions`);
};

export const getMemberAnalytics = async (userId: string, period: string): Promise<any> => {
  return api.get<any>(`/family/members/${userId}/analytics?period=${period}`);
};

export const acceptInvitation = async (invitationToken: string): Promise<FamilyGroup> => {
  return api.post<FamilyGroup>('/family/invitations/accept', { token: invitationToken });
};

export const rejectInvitation = async (invitationToken: string): Promise<void> => {
  return api.post<void>('/family/invitations/reject', { token: invitationToken });
};

export const leaveFamily = async (): Promise<void> => {
  return api.post<void>('/family/leave');
};
