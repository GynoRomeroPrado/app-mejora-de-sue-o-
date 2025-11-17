import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiResponse, ApiError } from '@/types';

// API Configuration
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.sleepwise.app/v1';

const API_TIMEOUT = 30000; // 30 seconds

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await EncryptedStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Token expired, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await EncryptedStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            // Refresh token
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { token } = response.data;
            await EncryptedStorage.setItem('access_token', token);

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            await EncryptedStorage.removeItem('access_token');
            await EncryptedStorage.removeItem('refresh_token');
            // TODO: Dispatch logout action
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): ApiError {
    if (error.response) {
      // Server responded with error
      return {
        code: error.response.data?.code || 'SERVER_ERROR',
        message: error.response.data?.message || 'An error occurred',
        details: error.response.data?.details,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
      };
    } else {
      // Something else happened
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
      };
    }
  }

  // Generic HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, config);
    if (!response.data.success) {
      throw response.data.error || new Error('Request failed');
    }
    return response.data.data as T;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data, config);
    if (!response.data.success) {
      throw response.data.error || new Error('Request failed');
    }
    return response.data.data as T;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data, config);
    if (!response.data.success) {
      throw response.data.error || new Error('Request failed');
    }
    return response.data.data as T;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.patch(url, data, config);
    if (!response.data.success) {
      throw response.data.error || new Error('Request failed');
    }
    return response.data.data as T;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url, config);
    if (!response.data.success) {
      throw response.data.error || new Error('Request failed');
    }
    return response.data.data as T;
  }

  // File upload
  async uploadFile<T>(
    url: string,
    file: {
      uri: string;
      type: string;
      name: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file as any);

    const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(progress);
        }
      },
    });

    if (!response.data.success) {
      throw response.data.error || new Error('Upload failed');
    }
    return response.data.data as T;
  }

  // Get raw client for custom requests
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export default new ApiService();
