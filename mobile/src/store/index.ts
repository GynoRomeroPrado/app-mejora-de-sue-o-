import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import sleepReducer from './slices/sleepSlice';
import familyReducer from './slices/familySlice';
import settingsReducer from './slices/settingsSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sleep: sleepReducer,
    family: familyReducer,
    settings: settingsReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['sleep/setCurrentSession', 'sleep/addSession'],
        // Ignore these paths in the state
        ignoredPaths: ['sleep.currentSession.startTime', 'sleep.currentSession.endTime'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
