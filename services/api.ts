import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance } from 'axios';

// API Base URL - Production API endpoint with HTTPS
const API_BASE_URL = 'https://api.kashifroad.com';

// Storage keys
const TOKEN_KEY = '@kashif_access_token';
const REFRESH_TOKEN_KEY = '@kashif_refresh_token';
const USER_KEY = '@kashif_user';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for slower networks
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

  // Update user language preference
  updateLanguagePreference: async (language: string): Promise<void> => {
    await api.patch('/api/auth/me/language', { language });
  },

  // Update user profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch<User>('/api/auth/me', data);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));
    return response.data;
  },
};

// User API - alias for authAPI
export const userAPI = authAPI;

// Lookup data API
export interface Level {
  id: number;
  name: string;
  min_report_number: number;
}

export interface Category {
  id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  color?: string;
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

// Helper function to get stored user (fetches fresh data from server)
export const getStoredUser = async (): Promise<User | null> => {
  try {
    // Try to get fresh data from server first
    const user = await authAPI.getProfile();
    return user;
  } catch (error) {
    // Fallback to cached data if server request fails
    const userStr = await AsyncStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
};

// Logout helper
export const logout = async (): Promise<void> => {
  await authAPI.logout();
};

// Gamification API
export interface PointTransaction {
  id: number;
  user_id: number;
  points: number;
  transaction_type: string;
  report_id?: number;
  description?: string;
  created_at: string;
}

export interface UserPoints {
  user_id: number;
  total_points: number;
}

export const gamificationAPI = {
  // Get user's point transactions
  getMyTransactions: async (skip: number = 0, limit: number = 10): Promise<PointTransaction[]> => {
    const response = await api.get<PointTransaction[]>('/api/gamification/transactions/me', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Get user's total points
  getMyPoints: async (): Promise<UserPoints> => {
    const response = await api.get<UserPoints>('/api/gamification/points/me');
    return response.data;
  },

  // Confirm report existence (award 20 points)
  confirmReport: async (reportId: number): Promise<{ points: number; message: string }> => {
    const response = await api.post<{ points: number; message: string }>(
      `/api/gamification/confirm-report/${reportId}`
    );
    return response.data;
  },
};

// Reporting API
export interface Report {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  category_id: number;
  severity_id: number;
  status_id: number;
  title?: string;
  description: string;
  photo_urls?: string;
  address_text?: string;
  user_hide: boolean;
  confirmation_status: 'pending' | 'confirmed' | 'expired';
  confirmed_by_user_id?: number;
  confirmed_at?: string;
  points_awarded: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ReportCreate {
  title?: string;
  description: string;
  category_id: number;
  latitude: number;
  longitude: number;
  address_text?: string;
  severity_id: number;
  photo_urls?: string;
}

export interface ReportStatusUpdate {
  status_id: number;
  comment?: string;
}

export interface ReportStatusHistory {
  id: number;
  report_id: number;
  old_status_id?: number;
  new_status_id: number;
  changed_by_user_id: number;
  comment?: string;
  created_at: string;
}

export interface ConfirmReportRequest {
  latitude?: number;
  longitude?: number;
}

export interface ConfirmReportResponse {
  success: boolean;
  message: string;
  report_confirmed: boolean;
  points_awarded: number;
}

export const reportingAPI = {
  // Upload image for report
  uploadImage: async (imageUri: string): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    
    // Get file extension from uri
    const uriParts = imageUri.split('.');
    const fileExtension = uriParts[uriParts.length - 1];
    
    // Create file object for form data
    const file = {
      uri: imageUri,
      type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
      name: `photo_${Date.now()}.${fileExtension}`,
    } as any;
    
    formData.append('file', file);
    
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    
    const response = await fetch(`${API_BASE_URL}/api/reports/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to upload image');
    }
    
    const data = await response.json();
    // Return full URL for the uploaded image
    return {
      url: `${API_BASE_URL}/api/reports${data.url}`,
      filename: data.filename,
    };
  },

  // Get user's reports (includes pending)
  getMyReports: async (skip: number = 0, limit: number = 100): Promise<Report[]> => {
    const response = await api.get<Report[]>('/api/reports/my-reports', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Get all confirmed reports (with filters)
  getReports: async (params?: {
    skip?: number;
    limit?: number;
    status_filter?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    include_pending?: boolean;
  }): Promise<Report[]> => {
    const response = await api.get<Report[]>('/api/reports/', {
      params,
    });
    return response.data;
  },

  // Get pending reports nearby that can be confirmed
  getPendingNearby: async (latitude: number, longitude: number, radius_km: number = 5): Promise<Report[]> => {
    const response = await api.get<Report[]>('/api/reports/pending-nearby', {
      params: { latitude, longitude, radius_km },
    });
    return response.data;
  },

  // Get single report
  getReport: async (reportId: number): Promise<Report> => {
    const response = await api.get<Report>(`/api/reports/${reportId}`);
    return response.data;
  },

  // Create new report (starts as pending)
  createReport: async (report: ReportCreate): Promise<Report> => {
    const response = await api.post<Report>('/api/reports/', report);
    return response.data;
  },

  // Confirm a report exists ("Still There" button)
  confirmReport: async (reportId: number, location?: { latitude: number; longitude: number }): Promise<ConfirmReportResponse> => {
    const response = await api.post<ConfirmReportResponse>(
      `/api/reports/${reportId}/confirm`,
      location ? { latitude: location.latitude, longitude: location.longitude } : {}
    );
    return response.data;
  },

  // Update report status
  updateReportStatus: async (reportId: number, statusUpdate: ReportStatusUpdate): Promise<Report> => {
    const response = await api.patch<Report>(`/api/reports/${reportId}/status`, statusUpdate);
    return response.data;
  },

  // Get report status history
  getReportHistory: async (reportId: number): Promise<ReportStatusHistory[]> => {
    const response = await api.get<ReportStatusHistory[]>(`/api/reports/${reportId}/history`);
    return response.data;
  },
};

export default api;
