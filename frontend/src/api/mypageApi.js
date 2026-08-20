import { apiClient } from './client.js';

export const mypageApi = {
  getEntries: () => apiClient.get('/mypage/entries'),
  cancelEntry: (entryId) => apiClient.post(`/mypage/entries/${entryId}/cancel`),
  getProfile: () => apiClient.get('/mypage/profile'),
  updateProfile: (data) => apiClient.patch('/mypage/profile', data),
  changePassword: (data) => apiClient.patch('/mypage/password', data),
};
