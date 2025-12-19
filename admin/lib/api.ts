import axios from 'axios';

// Direct connection to backend gateway
const API_BASE_URL = 'http://87.106.51.243:8000';

console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/api/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Users
export const usersAPI = {
  getUsers: async (skip = 0, limit = 100) => {
    const response = await api.get(`/api/auth/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  
  getUser: async (userId: number) => {
    const response = await api.get(`/api/auth/users/${userId}`);
    return response.data;
  },
  
  updateUser: async (userId: number, data: any) => {
    const response = await api.patch(`/api/auth/users/${userId}`, data);
    return response.data;
  },
  
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/api/auth/users/${userId}`);
    return response.data;
  },
  
  awardPoints: async (userId: number, points: number, description: string) => {
    const response = await api.post('/api/gamification/points/award', {
      user_id: userId,
      points,
      description,
    });
    return response.data;
  },
};

// Reports
export const reportsAPI = {
  getReports: async (params: any = {}) => {
    const response = await api.get('/api/reports', { params });
    return response.data;
  },
  
  getReport: async (reportId: number) => {
    const response = await api.get(`/api/reports/${reportId}`);
    return response.data;
  },
  
  updateReport: async (reportId: number, data: any) => {
    const response = await api.put(`/api/reports/${reportId}`, data);
    return response.data;
  },
  
  deleteReport: async (reportId: number) => {
    const response = await api.delete(`/api/reports/${reportId}`);
    return response.data;
  },
  
  getCategories: async () => {
    const response = await api.get('/api/reports/categories');
    return response.data;
  },
  
  getStatuses: async () => {
    const response = await api.get('/api/reports/statuses');
    return response.data;
  },
};

// Coupons
export const couponsAPI = {
  getCoupons: async (params: any = {}) => {
    const response = await api.get('/api/coupons', { params });
    return response.data;
  },
  
  getCoupon: async (couponId: number) => {
    const response = await api.get(`/api/coupons/${couponId}`);
    return response.data;
  },
  
  createCoupon: async (data: any) => {
    const response = await api.post('/api/coupons/', data);
    return response.data;
  },
  
  updateCoupon: async (couponId: number, data: any) => {
    const response = await api.patch(`/api/coupons/${couponId}`, data);
    return response.data;
  },
  
  deleteCoupon: async (couponId: number) => {
    const response = await api.delete(`/api/coupons/${couponId}`);
    return response.data;
  },
  
  getCompanies: async () => {
    const response = await api.get('/api/coupons/companies');
    return response.data;
  },
  
  createCompany: async (data: any) => {
    const response = await api.post('/api/coupons/companies', data);
    return response.data;
  },
  
  updateCompany: async (companyId: number, data: any) => {
    const response = await api.patch(`/api/coupons/companies/${companyId}`, data);
    return response.data;
  },
  
  deleteCompany: async (companyId: number) => {
    const response = await api.delete(`/api/coupons/companies/${companyId}`);
    return response.data;
  },
  
  getCategories: async () => {
    const response = await api.get('/api/coupons/categories');
    return response.data;
  },
  
  createCategory: async (data: any) => {
    const response = await api.post('/api/coupons/categories', data);
    return response.data;
  },
  
  updateCategory: async (categoryId: number, data: any) => {
    const response = await api.patch(`/api/coupons/categories/${categoryId}`, data);
    return response.data;
  },
  
  deleteCategory: async (categoryId: number) => {
    const response = await api.delete(`/api/coupons/categories/${categoryId}`);
    return response.data;
  },
  
  getRedemptions: async () => {
    const response = await api.get('/api/coupons/redemptions/me');
    return response.data;
  },
};

// Notifications
export const notificationsAPI = {
  sendNotification: async (data: any) => {
    const response = await api.post('/api/notifications/send', data);
    return response.data;
  },
};

// Analytics
export const analyticsAPI = {
  getLeaderboard: async (limit = 100) => {
    const response = await api.get(`/api/gamification/leaderboard?limit=${limit}`);
    return response.data;
  },
};
