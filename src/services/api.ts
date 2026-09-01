import axios from 'axios';

export const LANG_KEY = 'app-language';

export const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`, // Laragon default backend URL
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for adding the bearer token and current language
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Sync language preference with every request
    const lang = localStorage.getItem(LANG_KEY) ?? 'ar';
    config.headers['Accept-Language'] = lang;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
