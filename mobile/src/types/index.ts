// Core Types for SleepWise Mobile App

export enum SleepPhase {
  AWAKE = 'AWAKE',
  REM = 'REM',
  LIGHT = 'LIGHT',
  DEEP = 'DEEP',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  FAMILY = 'FAMILY',
  CORPORATE = 'CORPORATE',
}

export enum UserRole {
  USER = 'USER',
  FAMILY_ADMIN = 'FAMILY_ADMIN',
  FAMILY_MEMBER = 'FAMILY_MEMBER',
  CORPORATE_ADMIN = 'CORPORATE_ADMIN',
  CORPORATE_MEMBER = 'CORPORATE_MEMBER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  subscriptionTier: SubscriptionTier;
  role: UserRole;
  profileImage?: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SleepSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  sleepScore?: number; // 0-100
  efficiency?: number; // percentage
  phases: SleepPhaseSegment[];
  events: SleepEvent[];
  audioFileUrl?: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface SleepPhaseSegment {
  id: string;
  sessionId: string;
  phase: SleepPhase;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  confidence: number; // 0-1
}

export interface SleepEvent {
  id: string;
  sessionId: string;
  type: 'snoring' | 'apnea' | 'movement' | 'awakening' | 'other';
  timestamp: Date;
  duration?: number; // seconds
  severity?: 'low' | 'medium' | 'high';
  confidence: number;
  metadata?: Record<string, any>;
}

export interface HealthMetric {
  id: string;
  userId: string;
  type: 'heart_rate' | 'hrv' | 'spo2' | 'steps' | 'calories' | 'other';
  value: number;
  unit: string;
  timestamp: Date;
  source: 'healthkit' | 'googlefit' | 'manual' | 'other';
}

export interface Prediction {
  id: string;
  userId: string;
  type: 'sleep_quality' | 'apnea_risk' | 'cognitive_decline' | 'burnout' | 'other';
  value: number; // 0-1 probability or score
  confidence: number; // 0-1
  explanation: string;
  recommendations: string[];
  createdAt: Date;
  validUntil: Date;
}

export interface FamilyGroup {
  id: string;
  name: string;
  adminId: string;
  members: FamilyMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMember {
  userId: string;
  groupId: string;
  role: 'admin' | 'member';
  permissions: FamilyPermissions;
  nickname?: string;
  addedAt: Date;
}

export interface FamilyPermissions {
  viewSleepScore: boolean;
  viewDetailedStats: boolean;
  viewEvents: boolean;
  receiveAlerts: boolean;
  manageSettings: boolean;
}

export interface CorporateOrganization {
  id: string;
  name: string;
  adminId: string;
  employees: number;
  subscriptionTier: SubscriptionTier;
  settings: CorporateSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateSettings {
  anonymizationLevel: 'full' | 'partial' | 'minimal';
  alertsEnabled: boolean;
  reportingFrequency: 'daily' | 'weekly' | 'monthly';
  customMetrics: string[];
}

export interface Analytics {
  userId: string;
  period: 'week' | 'month' | 'year';
  averageSleepScore: number;
  averageDuration: number;
  averageEfficiency: number;
  phaseDistribution: {
    [key in SleepPhase]: number; // percentage
  };
  eventCounts: {
    [key: string]: number;
  };
  trends: {
    sleepScore: TrendData[];
    duration: TrendData[];
    efficiency: TrendData[];
  };
  insights: Insight[];
}

export interface TrendData {
  date: Date;
  value: number;
}

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  actionable: boolean;
  actions?: string[];
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'alert' | 'insight' | 'reminder' | 'family' | 'corporate' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export interface SmartAlarm {
  id: string;
  userId: string;
  targetTime: Date;
  windowMinutes: number; // wake up window before target
  enabled: boolean;
  daysOfWeek: number[]; // 0-6, Sunday = 0
  vibrate: boolean;
  soundUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Store Types
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SleepState {
  currentSession: SleepSession | null;
  sessions: SleepSession[];
  analytics: Analytics | null;
  isRecording: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface FamilyState {
  group: FamilyGroup | null;
  memberSessions: Record<string, SleepSession[]>;
  isLoading: boolean;
  error: string | null;
}

export interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  audioQuality: 'low' | 'medium' | 'high';
  privacyMode: boolean;
  language: string;
  units: 'metric' | 'imperial';
}

// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  SleepSession: { sessionId?: string };
  SleepDetails: { sessionId: string };
  Analytics: undefined;
  Family: undefined;
  FamilyMemberDetail: { userId: string };
  Corporate: undefined;
  Settings: undefined;
  Profile: undefined;
  Subscription: undefined;
  Notifications: undefined;
  SmartAlarm: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Sleep: undefined;
  Insights: undefined;
  Family: undefined;
  Profile: undefined;
};
