import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://cps-production-6d97.up.railway.app/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// The instance-level default Content-Type above is only correct for JSON
// bodies. For multipart uploads (FormData), it must be removed so the
// browser can set its own 'multipart/form-data; boundary=...' header —
// otherwise the boundary is missing and the backend can't parse the file.
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export default api;
