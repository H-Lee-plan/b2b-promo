import { apiClient } from './client.js';

export const eventsApi = {
  list: () => apiClient.get('/events', { auth: false }),
  get: (eventId) => apiClient.get(`/events/${eventId}`, { auth: false }),
  create: (data) => apiClient.post('/events', data),
  update: (eventId, data) => apiClient.patch(`/events/${eventId}`, data),
  remove: (eventId) => apiClient.delete(`/events/${eventId}`),
  close: (eventId) => apiClient.post(`/events/${eventId}/close`),
};
