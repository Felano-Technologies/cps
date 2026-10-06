import axios from 'axios';
import { MOCK_MODE, mockFallback } from './mockApi';

export const AUTH_TOKEN_STORAGE_KEY = 'cps_auth_token';

export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'https://cps-production-6d97.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // The instance-level default Content-Type above is only correct for JSON
  // bodies. For multipart uploads (FormData), it must be removed so the
  // browser can set its own 'multipart/form-data; boundary=...' header —
  // otherwise the boundary is missing and the backend can't parse the file.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  // The httpOnly session cookie is the primary auth mechanism, but some
  // mobile browsers block SameSite=None cookies on cross-site requests
  // (frontend and backend are on different domains). Fall back to a
  // Bearer token stored at login/signup so those requests still work.
  try {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // localStorage unavailable (private browsing, blocked storage) — fall back to cookie-only auth.
  }

  return config;
});

if (MOCK_MODE) {
  api.interceptors.response.use(response => response, async error => {
    const fallback = mockFallback(error.config);
    return fallback ? fallback : Promise.reject(error);
  });
}

export default api;
