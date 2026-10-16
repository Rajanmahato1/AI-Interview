import api from './client';

// ── Auth ────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  firebaseAuth: (data) => api.post('/auth/firebase', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ── Dashboard ───────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// ── Interviews ──────────────────────────────────────────────────────
export const interviewApi = {
  create: (data) => api.post('/interviews', data),
  getAll: (params) => api.get('/interviews', { params }),
  getOne: (id) => api.get(`/interviews/${id}`),
  start: (id) => api.post(`/interviews/${id}/start`),
  nextQuestion: (id) => api.post(`/interviews/${id}/next-question`),
  submitAnswer: (id, data) => api.post(`/interviews/${id}/answers`, data),
  evaluateAnswer: (id, answerId) => api.post(`/interviews/${id}/answers/${answerId}/evaluate`),
  complete: (id) => api.post(`/interviews/${id}/complete`),
  resume: (id) => api.post(`/interviews/${id}/resume`),
  delete: (id) => api.delete(`/interviews/${id}`),
};

// ── Reports ──────────────────────────────────────────────────────────
export const reportApi = {
  getAll: (params) => api.get('/reports', { params }),
  getOne: (id) => api.get(`/reports/${id}`),
  getPdfUrl: (id) => `/api/reports/${id}/pdf`,
};

// ── Profile ──────────────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
};
