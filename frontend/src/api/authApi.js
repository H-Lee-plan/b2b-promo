import { apiClient } from './client.js';

export const authApi = {
  signup: (data) => apiClient.post('/auth/signup', data, { auth: false }),
  login: (data) => apiClient.post('/auth/login', data, { auth: false }),
  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }, { auth: false }),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }, { auth: false }),
};
