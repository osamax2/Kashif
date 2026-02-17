import axios from 'axios';

// Use Next.js API proxy to avoid firewall/CORS issues
const API_BASE_URL = '';

// Backend URL for direct image access (uploads are served from auth-service)
export const BACKEND_URL = 'https://api.kashifroad.com';

// Helper function to get full image URL
export function getImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it's a relative path starting with /api/, prepend the backend URL
  if (url.startsWith('/api/')) {
    return `${BACKEND_URL}${url}`;
  }
  // Otherwise return as-is
  return url;
}

console.log('API Base URL:', API_BASE_URL || 'Using Next.js proxy /api/*');

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
  
  // Trash management
  getDeletedUsers: async (skip = 0, limit = 100) => {
    const response = await api.get(`/api/auth/users/trash?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  
  restoreUser: async (userId: number) => {
    const response = await api.post(`/api/auth/users/${userId}/restore`);
    return response.data;
  },
  
  permanentDeleteUser: async (userId: number) => {
    const response = await api.delete(`/api/auth/users/${userId}/permanent`);
    return response.data;
  },
  
  createCompanyUser: async (data: { email: string; password: string; full_name: string; company_id: number; phone_number?: string }) => {
    const response = await api.post('/api/auth/users/company', data);
    return response.data;
  },

  createGovernmentUser: async (data: { email: string; password: string; full_name: string; phone?: string; city?: string; district?: string; job_description?: string; language?: string }) => {
    const response = await api.post('/api/auth/users/government', data);
    return response.data;
  },

  createNormalUser: async (data: { email: string; password: string; full_name: string; phone: string }) => {
    const response = await api.post('/api/auth/users/normal', data);
    return response.data;
  },

  // Company member management
  getCompanyUsersCount: async (companyId: number) => {
    const response = await api.get(`/api/auth/users/company/${companyId}/count`);
    return response.data;
  },

  getCompanyMembers: async (companyId: number) => {
    const response = await api.get(`/api/auth/users/company/${companyId}/members`);
    return response.data;
  },

  addCompanyMember: async (data: { email: string; password: string; full_name: string; phone?: string; language?: string; max_users?: number }) => {
    const response = await api.post('/api/auth/users/company/add-member', data);
    return response.data;
  },

  removeCompanyMember: async (userId: number) => {
    const response = await api.delete(`/api/auth/users/company/member/${userId}`);
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

  resetPassword: async (userId: number, newPassword: string) => {
    const response = await api.post(`/api/auth/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
    return response.data;
  },

  createAdminUser: async (data: { email: string; password: string; full_name: string; phone?: string }) => {
    const response = await api.post('/api/auth/users/admin', data);
    return response.data;
  },

  bulkUpdateUserStatus: async (userIds: number[], newStatus: string) => {
    const response = await api.post('/api/auth/users/bulk-status', {
      user_ids: userIds,
      status: newStatus,
    });
    return response.data;
  },
};

// Audit Logs
export const auditAPI = {
  getLogs: async (params: { skip?: number; limit?: number; action?: string; user_id?: number } = {}) => {
    const response = await api.get('/api/auth/audit-logs', { params });
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
  
  updateReportStatus: async (reportId: number, data: { status_id: number; admin_comment?: string }) => {
    const response = await api.patch(`/api/reports/${reportId}/status`, {
      status_id: data.status_id,
      comment: data.admin_comment || ''
    });
    return response.data;
  },
  
  deleteReport: async (reportId: number) => {
    const response = await api.delete(`/api/reports/${reportId}`);
    return response.data;
  },

  restoreReport: async (reportId: number) => {
    const response = await api.post(`/api/reports/${reportId}/restore`);
    return response.data;
  },

  getDeletedReports: async () => {
    const response = await api.get('/api/reports/trash/all');
    return response.data;
  },

  getReportHistory: async (reportId: number) => {
    const response = await api.get(`/api/reports/${reportId}/history`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/api/reports/categories');
    return response.data;
  },

  createCategory: async (data: { name: string; name_ar?: string; description?: string }) => {
    const response = await api.post('/api/reports/categories', data);
    return response.data;
  },

  updateCategory: async (categoryId: number, data: { name?: string; name_ar?: string; description?: string }) => {
    const response = await api.patch(`/api/reports/categories/${categoryId}`, data);
    return response.data;
  },

  deleteCategory: async (categoryId: number) => {
    const response = await api.delete(`/api/reports/categories/${categoryId}`);
    return response.data;
  },
  
  getStatuses: async () => {
    const response = await api.get('/api/reports/statuses');
    return response.data;
  },

  bulkUpdateStatus: async (reportIds: number[], statusId: number, comment?: string) => {
    const response = await api.post('/api/reports/bulk-status', {
      report_ids: reportIds,
      status_id: statusId,
      comment: comment || '',
    });
    return response.data;
  },

  bulkDeleteReports: async (reportIds: number[]) => {
    const response = await api.post('/api/reports/bulk-delete', {
      report_ids: reportIds,
    });
    return response.data;
  },

  exportCSV: async (params: any = {}) => {
    const response = await api.get('/api/reports/export/csv', {
      params,
      responseType: 'blob',
    });
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
  
  // Coupon Trash management
  getDeletedCoupons: async (companyId?: number) => {
    const params = companyId ? `?company_id=${companyId}` : '';
    const response = await api.get(`/api/coupons/trash${params}`);
    return response.data;
  },
  
  restoreCoupon: async (couponId: number) => {
    const response = await api.post(`/api/coupons/${couponId}/restore`);
    return response.data;
  },
  
  permanentDeleteCoupon: async (couponId: number) => {
    const response = await api.delete(`/api/coupons/${couponId}/permanent`);
    return response.data;
  },
  
  getCompanies: async () => {
    const response = await api.get('/api/coupons/companies');
    return response.data;
  },

  getCompanyCoupons: async (companyId: number) => {
    const response = await api.get(`/api/coupons/companies/${companyId}/coupons`);
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

  getRedemptionsByCompany: async () => {
    const response = await api.get('/api/coupons/redemptions/stats/by-company');
    return response.data;
  },

  getCompanyCouponStats: async (companyId: number, startDate?: string, endDate?: string) => {
    let url = `/api/coupons/redemptions/stats/company/${companyId}`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  getCompanyRedemptionsOverTime: async (companyId: number, days: number = 30) => {
    const response = await api.get(`/api/coupons/redemptions/stats/company/${companyId}/over-time?days=${days}`);
    return response.data;
  },

  getCompanyStatsSummary: async (companyId: number) => {
    const response = await api.get(`/api/coupons/redemptions/stats/company/${companyId}/summary`);
    return response.data;
  },

  verifyRedemption: async (verificationCode: string) => {
    const response = await api.post('/api/coupons/redemptions/verify', { verification_code: verificationCode });
    return response.data;
  },

  checkRedemptionStatus: async (verificationCode: string) => {
    const response = await api.get(`/api/coupons/redemptions/check/${verificationCode}`);
    return response.data;
  },
};

// Notifications
export const notificationsAPI = {
  sendNotification: async (data: any) => {
    // Remove 'data' field as backend expects type, not data
    const { data: _, ...notificationData } = data;
    const response = await api.post('/api/notifications/send', notificationData);
    return response.data;
  },
  broadcastNotification: async (data: { title: string; body: string; type: string; target_role?: string | null }) => {
    const response = await api.post('/api/notifications/broadcast', data);
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

// Feedback
export const feedbackAPI = {
  getAll: async (params?: { status_filter?: string; category?: string; skip?: number; limit?: number }) => {
    const response = await api.get('/api/reports/feedback', { params });
    return response.data;
  },

  update: async (feedbackId: number, data: { status?: string; admin_notes?: string }) => {
    const response = await api.put(`/api/reports/feedback/${feedbackId}`, data);
    return response.data;
  },
};

// Donations
export const donationsAPI = {
  getDonations: async (params?: { report_id?: number; skip?: number; limit?: number }) => {
    const response = await api.get('/api/reports/donations', { params });
    return response.data;
  },

  updateRepairCost: async (reportId: number, repairCost: number) => {
    const response = await api.patch(`/api/reports/${reportId}/repair-cost`, { repair_cost: repairCost });
    return response.data;
  },
};
