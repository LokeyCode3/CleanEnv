import axios, { AxiosError } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ph_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('ph_refresh');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('ph_token', data.data.token);
          localStorage.setItem('ph_refresh', data.data.refreshToken);
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${data.data.token}`;
            return api.request(error.config);
          }
        } catch {
          localStorage.removeItem('ph_token');
          localStorage.removeItem('ph_refresh');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; phone: string; password: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; phone?: string }) => api.patch('/auth/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportApi = {
  create: (formData: FormData) =>
    api.post('/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getById: (reportId: string) => api.get(`/reports/${reportId}`),
  getMy: (params?: Record<string, string | number>) => api.get('/reports/my', { params }),
  getNearby: (params: { lat: number; lng: number; radius?: number; category?: string; status?: string }) =>
    api.get('/reports/nearby', { params }),
  checkDuplicate: (params: { lat: number; lng: number; categoryId: string; radius?: number }) =>
    api.get('/reports/check-duplicate', { params }),
  support: (reportId: string) => api.post(`/reports/${reportId}/support`),
  validateImage: (formData: FormData) =>
    api.post('/reports/validate-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoryApi = {
  getAll: () => api.get('/categories'),
  create: (data: unknown) => api.post('/categories', data),
  update: (id: string, data: unknown) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// ─── Departments ──────────────────────────────────────────────────────────────
export const departmentApi = {
  getAll: () => api.get('/departments'),
  create: (data: unknown) => api.post('/departments', data),
  update: (id: string, data: unknown) => api.put(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
  getOfficers: (id: string) => api.get(`/departments/${id}/officers`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  // Reports
  listReports: (params?: Record<string, string | number>) =>
    api.get('/admin/reports', { params }),
  updateStatus: (reportId: string, status: string, comment?: string) =>
    api.patch(`/admin/reports/${reportId}/status`, { status, comment }),
  assignReport: (reportId: string, data: { departmentId?: string; officerId?: string }) =>
    api.patch(`/admin/reports/${reportId}/assign`, data),
  addComment: (reportId: string, text: string, isPublic: boolean) =>
    api.post(`/admin/reports/${reportId}/comment`, { text, isPublic }),
  updateSeverity: (reportId: string, severity: string, reason?: string) =>
    api.patch(`/admin/reports/${reportId}/severity`, { severity, reason }),
  rejectReport: (reportId: string, reason: string) =>
    api.patch(`/admin/reports/${reportId}/reject`, { reason }),
  markDuplicate: (reportId: string, parentReportId: string) =>
    api.patch(`/admin/reports/${reportId}/duplicate`, { parentReportId }),

  // Analytics
  getDashboardStats: () => api.get('/admin/analytics/dashboard'),
  getReportsOverTime: (months?: number) => api.get('/admin/analytics/over-time', { params: { months } }),
  getByCategory: () => api.get('/admin/analytics/by-category'),
  getBySeverity: () => api.get('/admin/analytics/by-severity'),
  getHeatmap: () => api.get('/admin/analytics/heatmap'),
  getDeptPerformance: () => api.get('/admin/analytics/departments'),

  // Users
  listUsers: (params?: Record<string, string | number>) => api.get('/admin/users', { params }),
  createUser: (data: unknown) => api.post('/admin/users', data),
  updateUser: (id: string, data: unknown) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  // Audit
  getAuditLogs: (params?: Record<string, string | number>) =>
    api.get('/admin/audit-logs', { params }),
};

// ─── Officer ──────────────────────────────────────────────────────────────────
export const officerApi = {
  getReports: (params?: Record<string, string | number>) => api.get('/officer/reports', { params }),
  updateProgress: (reportId: string, formData: FormData) =>
    api.patch(`/officer/reports/${reportId}/progress`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  submitResolution: (reportId: string, formData: FormData) =>
    api.post(`/officer/reports/${reportId}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationApi = {
  getAll: (params?: Record<string, number>) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ─── Public ───────────────────────────────────────────────────────────────────
export const publicApi = {
  getStats: () => api.get('/public/stats'),
};
