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

export interface TermsOfService {
  id: number;
  version: string;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  is_active: boolean;
  requires_re_acceptance: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TosStatus {
  has_accepted_current: boolean;
  current_version?: string;
  accepted_version?: string;
  requires_acceptance: boolean;
}

export interface FeedbackData {
  type: 'bug' | 'suggestion' | 'complaint' | 'other';
  subject: string;
  message: string;
  report_id?: number;
}

export interface Feedback {
  id: number;
  user_id: number;
  type: string;
  subject: string;
  message: string;
  report_id?: number;
  status: string;
  admin_response?: string;
  created_at: string;
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

  // Forgot password - request reset code
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await axios.post<{ message: string }>(
      `${API_BASE_URL}/api/auth/forgot-password`,
      { email }
    );
    return response.data;
  },

  // Reset password with token
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await axios.post<{ message: string }>(
      `${API_BASE_URL}/api/auth/reset-password`,
      { token, new_password: newPassword }
    );
    return response.data;
  },

  // Verify email code (for registration verification)
  verifyCode: async (email: string, code: string): Promise<{ message: string }> => {
    const response = await axios.post<{ message: string }>(
      `${API_BASE_URL}/api/auth/verify-code`,
      { email, code }
    );
    return response.data;
  },

  // Resend verification code
  resendVerificationCode: async (email: string): Promise<{ message: string }> => {
    const response = await axios.post<{ message: string }>(
      `${API_BASE_URL}/api/auth/resend-verification`,
      { email }
    );
    return response.data;
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

  // Upload profile picture
  uploadProfilePicture: async (imageUri: string): Promise<{ image_url: string }> => {
    const formData = new FormData();
    const uriParts = imageUri.split('.');
    const fileExtension = uriParts[uriParts.length - 1];
    
    const file = {
      uri: imageUri,
      type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
      name: `profile_${Date.now()}.${fileExtension}`,
    } as any;
    
    formData.append('file', file);
    
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/me/profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to upload profile picture');
    }
    
    return await response.json();
  },

  // Delete profile picture
  deleteProfilePicture: async (): Promise<void> => {
    await api.delete('/api/auth/me/profile-picture');
  },

  // Get current active Terms of Service (public)
  getCurrentTos: async (): Promise<TermsOfService> => {
    const response = await axios.get<TermsOfService>(`${API_BASE_URL}/api/auth/tos/current`);
    return response.data;
  },

  // Accept Terms of Service
  acceptTos: async (tosId: number): Promise<void> => {
    await api.post('/api/auth/tos/accept', { tos_id: tosId });
  },

  // Check TOS acceptance status
  getTosStatus: async (): Promise<TosStatus> => {
    const response = await api.get<TosStatus>('/api/auth/tos/status');
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

// Achievement types
export interface Achievement {
  id: number;
  key: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  icon: string;
  category: string;
  condition_type: string;
  condition_value: number;
  points_reward: number;
  is_active: boolean;
  created_at: string;
  unlocked?: boolean;
  unlocked_at?: string;
}

export interface AchievementCheckResult {
  new_achievements: Achievement[];
  total_unlocked: number;
}

export const achievementAPI = {
  // Get all achievements with user's unlock status
  getMyAchievements: async (): Promise<Achievement[]> => {
    const response = await api.get<Achievement[]>('/api/gamification/achievements/my');
    return response.data;
  },

  // Get all achievements (public)
  getAllAchievements: async (): Promise<Achievement[]> => {
    const response = await api.get<Achievement[]>('/api/gamification/achievements');
    return response.data;
  },

  // Check and unlock new achievements
  checkAchievements: async (): Promise<AchievementCheckResult> => {
    const response = await api.post<AchievementCheckResult>('/api/gamification/achievements/check');
    return response.data;
  },
};

// Weekly Challenge types
export interface WeeklyChallenge {
  id: number;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  condition_type: string;
  target_value: number;
  bonus_points: number;
  week_start: string;
  week_end: string;
  is_active: boolean;
  created_at: string;
  current_value: number;
  completed: boolean;
  completed_at?: string;
  progress_percent: number;
}

export interface ChallengeCheckResult {
  completed_challenges: WeeklyChallenge[];
  total_active: number;
  total_completed: number;
}

export const challengeAPI = {
  getActive: async (): Promise<WeeklyChallenge[]> => {
    const response = await api.get<WeeklyChallenge[]>('/api/gamification/challenges/active');
    return response.data;
  },

  check: async (): Promise<ChallengeCheckResult> => {
    const response = await api.post<ChallengeCheckResult>('/api/gamification/challenges/check');
    return response.data;
  },
};

// Friends / Social types
export interface FriendLeaderboardEntry {
  user_id: number;
  full_name: string;
  total_points: number;
  rank: number;
}

export interface FriendInfo {
  friendship_id: number;
  friend_user_id: number;
  status: string;
  created_at: string;
}

export interface FriendshipRequest {
  id: number;
  user_id: number;
  friend_id: number;
  status: string;
  created_at: string;
  friend_name: string;
  friend_points: number;
}

export const friendsAPI = {
  sendRequest: async (friendId: number) => {
    const response = await api.post('/api/gamification/friends/request', { friend_id: friendId });
    return response.data;
  },

  getPendingRequests: async (): Promise<FriendshipRequest[]> => {
    const response = await api.get<FriendshipRequest[]>('/api/gamification/friends/requests');
    return response.data;
  },

  acceptRequest: async (friendshipId: number) => {
    const response = await api.post(`/api/gamification/friends/${friendshipId}/accept`);
    return response.data;
  },

  rejectRequest: async (friendshipId: number) => {
    const response = await api.post(`/api/gamification/friends/${friendshipId}/reject`);
    return response.data;
  },

  getFriends: async (): Promise<FriendInfo[]> => {
    const response = await api.get<FriendInfo[]>('/api/gamification/friends');
    return response.data;
  },

  getLeaderboard: async (): Promise<FriendLeaderboardEntry[]> => {
    const response = await api.get<FriendLeaderboardEntry[]>('/api/gamification/friends/leaderboard');
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
  ai_annotated_url?: string;  // URL to AI annotated image with bounding boxes
  ai_detections?: string;      // JSON string of detection bounding boxes
  address_text?: string;
  user_hide: boolean;
  confirmation_status: 'pending' | 'confirmed' | 'expired';
  confirmed_by_user_id?: number;
  confirmed_at?: string;
  confirmation_count: number;
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
  ai_annotated_url?: string;
  ai_detections?: string;
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

export interface NearbyDuplicate {
  id: number;
  title?: string;
  description: string;
  category_id: number;
  latitude: number;
  longitude: number;
  address_text?: string;
  confirmation_status: string;
  confirmation_count: number;
  status_id: number;
  created_at: string;
  distance_meters: number;
  photo_urls?: string;
}

export interface DuplicateCheckResponse {
  has_duplicates: boolean;
  count: number;
  nearby_reports: NearbyDuplicate[];
  message: string;
}

// ─── ROUTE WARNING TYPES ────────────────────────────────────────────
export interface RouteWaypoint {
  latitude: number;
  longitude: number;
}

export interface RouteReport {
  id: number;
  title?: string;
  description: string;
  category_id: number;
  latitude: number;
  longitude: number;
  address_text?: string;
  status_id: number;
  created_at: string;
  distance_from_route_meters: number;
  nearest_waypoint_index: number;
  photo_urls?: string;
  confirmation_status: string;
}

export interface RouteReportsResponse {
  total_hazards: number;
  reports: RouteReport[];
  summary: Record<number, number>;
}

export const reportingAPI = {
  // Check for nearby duplicates before creating a report
  checkDuplicates: async (latitude: number, longitude: number, categoryId: number): Promise<DuplicateCheckResponse> => {
    const response = await api.get<DuplicateCheckResponse>('/api/reports/check-duplicates', {
      params: { latitude, longitude, category_id: categoryId, radius_meters: 50 },
    });
    return response.data;
  },

  // Upload image for report - now includes AI analysis
  uploadImage: async (imageUri: string): Promise<{ 
    url: string; 
    filename: string;
    ai_analysis?: {
      num_potholes: number;
      max_severity: string | null;
      ai_description: string | null;
      ai_description_ar: string | null;
      detections: any[];
    };
  }> => {
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
    // Return relative URL for storage, full URL only for display
    // The backend stores just /uploads/xxx.jpg which works with the proxy
    return {
      url: data.url, // Keep relative URL like /uploads/xxx.jpg
      filename: data.filename,
      ai_analysis: data.ai_analysis,
      annotated_url: data.ai_analysis?.annotated_url, // URL to AI annotated image
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

  // Get reports along a route (Route Warning feature)
  getReportsAlongRoute: async (
    waypoints: RouteWaypoint[],
    bufferMeters: number = 200
  ): Promise<RouteReportsResponse> => {
    const response = await api.post<RouteReportsResponse>('/api/reports/along-route', {
      waypoints,
      buffer_meters: bufferMeters,
    });
    return response.data;
  },

  // ──── In-App Feedback ────

  submitFeedback: async (data: FeedbackData): Promise<Feedback> => {
    const response = await api.post<Feedback>('/api/reports/feedback', data);
    return response.data;
  },

  getMyFeedback: async (): Promise<Feedback[]> => {
    const response = await api.get<Feedback[]>('/api/reports/feedback/my');
    return response.data;
  },
};

export default api;
