import { apiClient } from './client.js';

export const entriesApi = {
  create: (eventId, data) => apiClient.post(`/events/${eventId}/entries`, data),
  list: (eventId) => apiClient.get(`/events/${eventId}/entries`),
  updateConsentNote: (eventId, entryId, data) =>
    apiClient.patch(`/events/${eventId}/entries/${entryId}/consent-note`, data),
  exportCsv: (eventId) => apiClient.getBlob(`/events/${eventId}/entries/export`),
};
