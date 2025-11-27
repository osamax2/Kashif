# Kashif Backend - Frontend Integration Guide

## 🔑 API Configuration for Frontend

### Base URL
```typescript
const API_BASE_URL = 'http://localhost:8000/api';
```

### No API Key Required! 🎉
This backend uses **JWT Bearer Token** authentication, not API keys.

## 📱 Frontend Setup

### 1. Environment Variables (.env)
```env
# For React Native Expo
EXPO_PUBLIC_API_URL=http://localhost:8000/api

# For Web (if using)
VITE_API_URL=http://localhost:8000/api
REACT_APP_API_URL=http://localhost:8000/api
```

### 2. API Client Setup (TypeScript/React Native)

```typescript
// services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - Add JWT token to all requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;

          // Save new tokens
          await AsyncStorage.setItem('access_token', access_token);
          await AsyncStorage.setItem('refresh_token', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        // Navigate to login screen
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 3. Authentication Service

```typescript
// services/auth.service.ts
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginCredentials {
  username: string; // email
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  total_points: number;
  image_url?: string;
  level_id?: number;
  status: string;
  created_at: string;
}

export const authService = {
  // Register new user
  async register(data: RegisterData): Promise<User> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Send as form data for OAuth2
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Save tokens
    const { access_token, refresh_token } = response.data;
    await AsyncStorage.setItem('access_token', access_token);
    await AsyncStorage.setItem('refresh_token', refresh_token);

    return response.data;
  },

  // Get current user info
  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    await AsyncStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } finally {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  },
};
```

### 4. Other Services Examples

```typescript
// services/reports.service.ts
import api from './api';

export interface CreateReportData {
  title: string;
  description: string;
  location_lat: number;
  location_lng: number;
  address: string;
  category_id: number;
  severity_id: number;
  photo_urls?: string; // comma-separated URLs
}

export const reportsService = {
  // Create new report
  async createReport(data: CreateReportData) {
    const response = await api.post('/reports/reports/', data);
    return response.data;
  },

  // Get user's reports
  async getMyReports() {
    const response = await api.get('/reports/reports/');
    return response.data;
  },

  // Get nearby reports
  async getNearbyReports(lat: number, lng: number, radius_km: number = 5) {
    const response = await api.get('/reports/reports/nearby', {
      params: { lat, lng, radius_km },
    });
    return response.data;
  },
};

// services/gamification.service.ts
export const gamificationService = {
  // Get user points
  async getPoints(userId: number) {
    const response = await api.get(`/gamification/points/${userId}`);
    return response.data;
  },

  // Get leaderboard
  async getLeaderboard(limit: number = 10) {
    const response = await api.get('/gamification/leaderboard/', {
      params: { limit },
    });
    return response.data;
  },
};

// services/coupons.service.ts
export const couponsService = {
  // Get available coupons
  async getCoupons() {
    const response = await api.get('/coupons/coupons/');
    return response.data;
  },

  // Redeem coupon
  async redeemCoupon(couponId: number, userId: number) {
    const response = await api.post('/coupons/coupons/redeem', {
      coupon_id: couponId,
      user_id: userId,
    });
    return response.data;
  },
};

// services/notifications.service.ts
export const notificationsService = {
  // Register device for push notifications
  async registerDevice(userId: number, fcmToken: string, deviceType: string = 'android') {
    const response = await api.post('/notifications/devices/register', {
      user_id: userId,
      fcm_token: fcmToken,
      device_type: deviceType,
    });
    return response.data;
  },

  // Get user notifications
  async getNotifications(userId: number) {
    const response = await api.get(`/notifications/notifications/user/${userId}`);
    return response.data;
  },
};
```

### 5. Usage in Components

```typescript
// Example: Login Screen
import { authService } from '../services/auth.service';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      // Login
      await authService.login({
        username: email, // Backend expects 'username' field
        password: password,
      });

      // Get user info
      const user = await authService.getCurrentUser();
      console.log('Logged in as:', user);

      // Navigate to home screen
      navigation.navigate('Home');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      <Button title="Login" onPress={handleLogin} />
      {error && <Text>{error}</Text>}
    </View>
  );
};
```

## 🌐 API Endpoints Reference

### Auth Service (`/api/auth/`)
- `POST /register` - Register new user
- `POST /token` - Login (returns JWT tokens)
- `POST /refresh` - Refresh access token
- `GET /me` - Get current user info
- `POST /logout` - Logout
- `GET /users/{user_id}` - Get user by ID

### Reporting Service (`/api/reports/`)
- `POST /reports/` - Create report
- `GET /reports/` - List user's reports
- `GET /reports/{report_id}` - Get report details
- `PUT /reports/{report_id}/status` - Update report status
- `GET /reports/nearby` - Get nearby reports

### Gamification Service (`/api/gamification/`)
- `GET /points/{user_id}` - Get user points
- `GET /points/{user_id}/transactions` - Get transaction history
- `GET /leaderboard/` - Get leaderboard

### Coupons Service (`/api/coupons/`)
- `GET /coupons/` - List available coupons
- `GET /coupons/{coupon_id}` - Get coupon details
- `POST /coupons/redeem` - Redeem coupon
- `GET /categories/` - List coupon categories
- `GET /companies/` - List companies

### Notification Service (`/api/notifications/`)
- `POST /devices/register` - Register FCM token
- `GET /notifications/user/{user_id}` - Get notifications
- `PUT /notifications/{notification_id}/read` - Mark as read
- `GET /notifications/user/{user_id}/unread-count` - Unread count

## 🔒 Security Notes

1. **No API Keys needed** - Only JWT tokens
2. **Access Token**: Expires in 30 minutes
3. **Refresh Token**: Expires in 7 days
4. **All endpoints** (except register/login) require `Authorization: Bearer <token>` header
5. The axios interceptor handles token refresh automatically

## 🛠️ Testing with curl

```bash
# 1. Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'

# 2. Login
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# 3. Use token (replace YOUR_TOKEN)
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📦 Required npm Packages

```bash
npm install axios @react-native-async-storage/async-storage
```

## ⚠️ Important Notes

1. **Base URL**: Change `localhost:8000` to your production URL when deploying
2. **CORS**: Already configured for `localhost:8081` (Expo), `localhost:19006` (Expo web)
3. **Token Storage**: Uses AsyncStorage (secure on mobile)
4. **Auto Refresh**: Tokens refresh automatically via interceptor
5. **Error Handling**: Always wrapped in try-catch blocks
