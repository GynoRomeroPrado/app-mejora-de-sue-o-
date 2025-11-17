import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Subscription {
  id: string;
  userId: string;
  tier: 'FREE' | 'PREMIUM' | 'FAMILY' | 'CORPORATE';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

interface SubscriptionState {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  subscription: null,
  isLoading: false,
  error: null,
};

export const fetchSubscription = createAsyncThunk(
  'subscription/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/subscription');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al obtener suscripción');
    }
  }
);

export const createCheckoutSession = createAsyncThunk(
  'subscription/createCheckout',
  async (data: { priceId: string; tier: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/subscription/checkout', data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear checkout');
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscription/cancel',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/subscription/cancel');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cancelar suscripción');
    }
  }
);

export const createCustomerPortalSession = createAsyncThunk(
  'subscription/customerPortal',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/subscription/customer-portal');
      return response.data.data.url;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear portal');
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscription = action.payload;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createCheckoutSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCheckoutSession.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createCheckoutSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(cancelSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscription = action.payload;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
