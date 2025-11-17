import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SettingsState } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState: SettingsState = {
  theme: 'dark',
  notifications: true,
  audioQuality: 'medium',
  privacyMode: false,
  language: 'en',
  units: 'metric',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
      AsyncStorage.setItem('theme', action.payload);
    },
    setNotifications: (state, action: PayloadAction<boolean>) => {
      state.notifications = action.payload;
      AsyncStorage.setItem('notifications', String(action.payload));
    },
    setAudioQuality: (state, action: PayloadAction<'low' | 'medium' | 'high'>) => {
      state.audioQuality = action.payload;
      AsyncStorage.setItem('audioQuality', action.payload);
    },
    setPrivacyMode: (state, action: PayloadAction<boolean>) => {
      state.privacyMode = action.payload;
      AsyncStorage.setItem('privacyMode', String(action.payload));
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      AsyncStorage.setItem('language', action.payload);
    },
    setUnits: (state, action: PayloadAction<'metric' | 'imperial'>) => {
      state.units = action.payload;
      AsyncStorage.setItem('units', action.payload);
    },
    loadSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
    resetSettings: () => {
      AsyncStorage.multiRemove(['theme', 'notifications', 'audioQuality', 'privacyMode', 'language', 'units']);
      return initialState;
    },
  },
});

export const {
  setTheme,
  setNotifications,
  setAudioQuality,
  setPrivacyMode,
  setLanguage,
  setUnits,
  loadSettings,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
