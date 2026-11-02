import axios from 'axios';

export const TOKEN_KEY = 'erp_token';

// Support Render/Vercel production environments with automatic fallback to local Vite proxy
let apiBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').trim();
if (apiBase.startsWith('http') && !apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
  apiBase = `${apiBase.replace(/\/$/, '')}/api`;
}

const http = axios.create({ baseURL: apiBase });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign('/login');
    }
    err.userMessage = err.response?.data?.message || 'Could not reach the server';
    return Promise.reject(err);
  }
);

export default http;
