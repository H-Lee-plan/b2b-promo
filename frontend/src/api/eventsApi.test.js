import { describe, it, expect, vi } from 'vitest';
import { apiClient } from './client.js';
import { eventsApi } from './eventsApi.js';

vi.mock('./client.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), getBlob: vi.fn() },
}));

describe('eventsApi', () => {
  it('list는 /events를 인증 없이 조회한다', () => {
    eventsApi.list();
    expect(apiClient.get).toHaveBeenCalledWith('/events', { auth: false });
  });

  it('get은 /events/:eventId를 인증 없이 조회한다', () => {
    eventsApi.get('e1');
    expect(apiClient.get).toHaveBeenCalledWith('/events/e1', { auth: false });
  });

  it('create는 /events에 POST한다', () => {
    const data = { title: '이벤트' };
    eventsApi.create(data);
    expect(apiClient.post).toHaveBeenCalledWith('/events', data);
  });

  it('update는 /events/:eventId에 PATCH한다', () => {
    const data = { title: '수정' };
    eventsApi.update('e1', data);
    expect(apiClient.patch).toHaveBeenCalledWith('/events/e1', data);
  });

  it('remove는 /events/:eventId를 DELETE한다', () => {
    eventsApi.remove('e1');
    expect(apiClient.delete).toHaveBeenCalledWith('/events/e1');
  });

  it('close는 /events/:eventId/close에 POST한다', () => {
    eventsApi.close('e1');
    expect(apiClient.post).toHaveBeenCalledWith('/events/e1/close');
  });
});
