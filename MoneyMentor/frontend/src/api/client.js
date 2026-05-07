import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mm_token');
      localStorage.removeItem('mm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;

// Auth
export const signup = (data) => client.post('/auth/signup', data);
export const login = (data) => client.post('/auth/login', data);
export const getProfile = () => client.get('/auth/profile');

// Files
export const listFiles = () => client.get('/files/');
export const deleteFile = (id) => client.delete(`/files/${id}`);

// Transactions
export const uploadCSV = (file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/transactions/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const getTransactions = (fileId) =>
  client.get('/transactions/', { params: fileId ? { file_id: fileId } : {} });

// Subscriptions
export const detectSubscriptions = (fileId) =>
  client.get('/subscriptions/detect', { params: fileId ? { file_id: fileId } : {} });
export const getSubscriptionSummary = (fileId) =>
  client.get('/subscriptions/summary', { params: fileId ? { file_id: fileId } : {} });

// Goals
export const createGoal = (data) => client.post('/goals/', data);
export const listGoals = () => client.get('/goals/');
export const deleteGoal = (id) => client.delete(`/goals/${id}`);
export const simulateGoal = (data) => client.post('/goals/simulate', data);
export const simulateAllGoals = (fileId) =>
  client.get('/goals/simulate-all', { params: fileId ? { file_id: fileId } : {} });

// Reports
export const getMonthlyReport = (fileId) =>
  client.get('/reports/monthly', { params: fileId ? { file_id: fileId } : {} });
export const getCategoryReport = (fileId) =>
  client.get('/reports/by-category', { params: fileId ? { file_id: fileId } : {} });

// AI
export const getAIStatus = () => client.get('/ai/status');
export const generateNegotiationScript = (data) => client.post('/ai/negotiate', data);
export const getSpendingInsights = (fileId) =>
  client.get('/ai/insights', {
    params: {
      ...(fileId ? { file_id: fileId } : {}),
      currency_symbol: '₹',
    },
  });
