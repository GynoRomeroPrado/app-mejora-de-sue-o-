import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FamilyState, FamilyGroup, FamilyMember, SleepSession } from '@/types';
import * as familyService from '@/services/family.service';

const initialState: FamilyState = {
  group: null,
  memberSessions: {},
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchFamilyGroup = createAsyncThunk(
  'family/fetchGroup',
  async (_, { rejectWithValue }) => {
    try {
      const group = await familyService.getFamilyGroup();
      return group;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch family group');
    }
  }
);

export const createFamilyGroup = createAsyncThunk(
  'family/createGroup',
  async (name: string, { rejectWithValue }) => {
    try {
      const group = await familyService.createFamilyGroup(name);
      return group;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create family group');
    }
  }
);

export const addFamilyMember = createAsyncThunk(
  'family/addMember',
  async ({ email, permissions }: { email: string; permissions: any }, { rejectWithValue }) => {
    try {
      const member = await familyService.addFamilyMember(email, permissions);
      return member;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add family member');
    }
  }
);

export const removeFamilyMember = createAsyncThunk(
  'family/removeMember',
  async (userId: string, { rejectWithValue }) => {
    try {
      await familyService.removeFamilyMember(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove family member');
    }
  }
);

export const updateMemberPermissions = createAsyncThunk(
  'family/updatePermissions',
  async ({ userId, permissions }: { userId: string; permissions: any }, { rejectWithValue }) => {
    try {
      const member = await familyService.updateMemberPermissions(userId, permissions);
      return member;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update permissions');
    }
  }
);

export const fetchMemberSessions = createAsyncThunk(
  'family/fetchMemberSessions',
  async (userId: string, { rejectWithValue }) => {
    try {
      const sessions = await familyService.getMemberSessions(userId);
      return { userId, sessions };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch member sessions');
    }
  }
);

// Slice
const familySlice = createSlice({
  name: 'family',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMemberSessions: (state, action: PayloadAction<string>) => {
      delete state.memberSessions[action.payload];
    },
  },
  extraReducers: (builder) => {
    // Fetch group
    builder
      .addCase(fetchFamilyGroup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFamilyGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.group = action.payload;
      })
      .addCase(fetchFamilyGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create group
    builder
      .addCase(createFamilyGroup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createFamilyGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.group = action.payload;
      })
      .addCase(createFamilyGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Add member
    builder
      .addCase(addFamilyMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addFamilyMember.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.group) {
          state.group.members.push(action.payload);
        }
      })
      .addCase(addFamilyMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Remove member
    builder
      .addCase(removeFamilyMember.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeFamilyMember.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.group) {
          state.group.members = state.group.members.filter((m) => m.userId !== action.payload);
        }
        delete state.memberSessions[action.payload];
      })
      .addCase(removeFamilyMember.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update permissions
    builder
      .addCase(updateMemberPermissions.fulfilled, (state, action) => {
        if (state.group) {
          const index = state.group.members.findIndex((m) => m.userId === action.payload.userId);
          if (index !== -1) {
            state.group.members[index] = action.payload;
          }
        }
      });

    // Fetch member sessions
    builder
      .addCase(fetchMemberSessions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMemberSessions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.memberSessions[action.payload.userId] = action.payload.sessions;
      })
      .addCase(fetchMemberSessions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearMemberSessions } = familySlice.actions;
export default familySlice.reducer;
