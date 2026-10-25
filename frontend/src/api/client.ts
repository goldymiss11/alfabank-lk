import axios, { AxiosError } from 'axios';

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

export default api;
