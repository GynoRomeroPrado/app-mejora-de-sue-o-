// SleepWise Color Palette - Optimized for Dark Mode

export const Colors = {
  // Primary - Calming Blues (sleep-focused)
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3', // Main primary
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Secondary - Relaxing Purple (REM sleep)
  secondary: {
    50: '#F3E5F5',
    100: '#E1BEE7',
    200: '#CE93D8',
    300: '#BA68C8',
    400: '#AB47BC',
    500: '#9C27B0', // Main secondary
    600: '#8E24AA',
    700: '#7B1FA2',
    800: '#6A1B9A',
    900: '#4A148C',
  },

  // Accent - Energizing Orange (wake up)
  accent: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800',
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },

  // Sleep Phases
  sleep: {
    awake: '#F44336',    // Red
    rem: '#9C27B0',      // Purple
    light: '#42A5F5',    // Light Blue
    deep: '#1565C0',     // Deep Blue
  },

  // Health Status
  health: {
    excellent: '#4CAF50',
    good: '#8BC34A',
    fair: '#FFC107',
    poor: '#FF9800',
    critical: '#F44336',
  },

  // Dark Theme (Primary)
  dark: {
    background: '#0A0E27',      // Deep navy
    surface: '#151933',         // Slightly lighter
    surfaceVariant: '#1E2440',  // Cards/elevated
    outline: '#2A3256',         // Borders
    text: {
      primary: '#FFFFFF',
      secondary: '#B8C1E8',
      disabled: '#6B7599',
    },
  },

  // Light Theme (Secondary - for settings/preferences)
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F2F5',
    outline: '#E1E4E8',
    text: {
      primary: '#1A1A1A',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
    },
  },

  // Semantic Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Charts & Visualizations
  chart: {
    gradient1: ['#2196F3', '#9C27B0'],
    gradient2: ['#1565C0', '#42A5F5'],
    gradient3: ['#9C27B0', '#E91E63'],
    line: '#64B5F6',
    grid: '#2A3256',
    axis: '#6B7599',
  },

  // Overlays
  overlay: {
    dark: 'rgba(10, 14, 39, 0.7)',
    medium: 'rgba(10, 14, 39, 0.5)',
    light: 'rgba(10, 14, 39, 0.3)',
  },

  // Transparent
  transparent: 'transparent',
};

export type ColorScheme = 'light' | 'dark';

export const getThemeColors = (scheme: ColorScheme = 'dark') => {
  return scheme === 'dark' ? Colors.dark : Colors.light;
};
