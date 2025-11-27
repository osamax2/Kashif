import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Base URL - Replace with your server IP
const API_BASE_URL = 'http://38.127.216.236:8000';

// Storage keys
const TOKEN_KEY = '@kashif_access_token';
const REFRESH_TOKEN_KEY = '@kashif_refresh_token';
const USER_KEY = '@kashif_user';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          await AsyncStorage.setItem(TOKEN_KEY, access_token);
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
}

export interface LoginData {
  username: string; // email
  password: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  total_points: number;
  image_url?: string;
  level_id?: number;
  status: string;
  role: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authAPI = {
  // Register new user
  register: async (data: RegisterData): Promise<User> => {
    const response = await api.post<User>('/api/auth/register', data);
    return response.data;
  },

  // Login
  login: async (data: LoginData): Promise<TokenResponse> => {
    // FastAPI OAuth2 expects form data
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);

    const response = await axios.post<TokenResponse>(
      `${API_BASE_URL}/api/auth/token`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Save tokens
    await AsyncStorage.setItem(TOKEN_KEY, response.data.access_token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);

    return response.data;
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/api/auth/me');
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  },
};

// Lookup data API
export interface Level {
  id: number;
  name: string;
  min_report_number: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface ReportStatus {
  id: number;
  name: string;
  description?: string;
}

export interface Severity {
  id: number;
  name: string;
  description?: string;
  category_id: number;
}

export const lookupAPI = {
  // Get all levels
  getLevels: async (): Promise<Level[]> => {
    const response = await api.get<Level[]>('/api/auth/levels');
    return response.data;
  },

  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/api/reports/categories');
    return response.data;
  },

  // Get all report statuses
  getStatuses: async (): Promise<ReportStatus[]> => {
    const response = await api.get<ReportStatus[]>('/api/reports/statuses');
    return response.data;
  },

  // Get all severities
  getSeverities: async (categoryId?: number): Promise<Severity[]> => {
    const response = await api.get<Severity[]>('/api/reports/severities', {
      params: categoryId ? { category_id: categoryId } : {},
    });
    return response.data;
  },
};

// Helper function to check if user is logged in
export const isLoggedIn = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return !!token;
};

// Helper function to get stored user
export const getStoredUser = async (): Promise<User | null> => {
  const userStr = await AsyncStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Logout helper
export const logout = async (): Promise<void> => {
  await authAPI.logout();
};

export default api;
