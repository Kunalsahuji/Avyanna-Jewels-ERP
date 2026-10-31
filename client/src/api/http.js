import axios from 'axios';

export const TOKEN_KEY = 'erp_token';

const http = axios.create({ baseURL: '/api' });

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
