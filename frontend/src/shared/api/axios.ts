import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://seashell-app-r36uj.ondigitalocean.app' : 'http://localhost:5000');

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // Essential for sending/receiving httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for catching 401s and silently refreshing tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops by checking _retry flag
    // Also ensure we don't try to refresh if the refresh endpoint itself failed
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        await axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        // If successful, retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails (e.g. refresh token expired), force logout
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
