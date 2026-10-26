import axios, { AxiosError } from 'axios';
import { handleMockRequest } from './mockAdapter';

export function getApiErrorMessage(error: unknown, fallback = 'Не удалось выполнить действие. Попробуйте ещё раз.') {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return 'Сервис временно недоступен. Проверьте подключение к API.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

// Intercept responses that return HTML or 405/404 (e.g. static hosting like Vercel without standalone backend)
api.interceptors.response.use(
  async (response) => {
    if (typeof response.data === 'string' && response.data.includes('<!doctype html')) {
      return await handleMockRequest(response.config);
    }
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 405 || status === 404 || error.code === 'ERR_NETWORK' || !error.response) {
      try {
        return await handleMockRequest(error.config || {});
      } catch (mockErr) {
        return Promise.reject(mockErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

