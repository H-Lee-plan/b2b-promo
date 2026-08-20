import { describe, it, expect, vi } from 'vitest';
import { apiClient } from './client.js';
import { entriesApi } from './entriesApi.js';

vi.mock('./client.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), getBlob: vi.fn() },
}));

describe('entriesApi', () => {
  it('create는 /events/:eventId/entries에 POST한다', () => {
    const data = { consent: true };
    entriesApi.create('e1', data);
    expect(apiClient.post).toHaveBeenCalledWith('/events/e1/entries', data);
  });

  it('list는 /events/:eventId/entries를 조회한다', () => {
    entriesApi.list('e1');
    expect(apiClient.get).toHaveBeenCalledWith('/events/e1/entries');
  });

  it('updateConsentNote는 consent-note 경로에 PATCH한다', () => {
    const data = { consentNote: '메모' };
    entriesApi.updateConsentNote('e1', 'entry1', data);
    expect(apiClient.patch).toHaveBeenCalledWith('/events/e1/entries/entry1/consent-note', data);
  });

  it('exportCsv는 export 경로를 Blob으로 조회한다', () => {
    entriesApi.exportCsv('e1');
    expect(apiClient.getBlob).toHaveBeenCalledWith('/events/e1/entries/export');
  });
});
