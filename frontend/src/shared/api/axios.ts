import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

// Use the relative path in the browser to go through Next.js rewrites, ensuring no CORS/binding issues
export const API_BASE_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || '');

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 300000,
  withCredentials: true, // Essential for sending/receiving httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

import axiosRetry from 'axios-retry';

// Automatically retry failed idempotent requests (GET, HEAD, OPTIONS, PUT, DELETE) due to network errors or 5xx errors
axiosRetry(api, { 
  retries: 2, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 503;
  }
});

api.interceptors.request.use((config) => {
  // Cookies are automatically sent because of `withCredentials: true`
  // We ALSO send the token via Bearer header as a fallback for strict cross-origin cookie blocking in Safari/Chrome
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  // CRITICAL FIX: For FormData (file uploads), we must NOT set Content-Type manually or it drops the boundary.
  // By deleting it, the browser will automatically set 'multipart/form-data; boundary=...'
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Queue for failed requests while token is refreshing
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
      if (isRefreshing) {
        // If already refreshing, wait for it to finish then retry
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          '/auth/refresh-token',
          {},
          { baseURL: `${API_BASE_URL}/api`, withCredentials: true }
        );

        const { accessToken } = response.data.data;
        if (typeof window !== 'undefined' && accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }
        isRefreshing = false;
        processQueue(null, accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
