import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from './client.js';
import { useAuthStore } from '../store/authStore.js';

function mockFetchOnce({ status = 200, json = null, headers = {} } = {}) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => headers[key] ?? (json !== null ? 'application/json' : null) },
    json: () => Promise.resolve(json),
    blob: () => Promise.resolve(new Blob(['csv'])),
  });
}

describe('apiClient', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('accessToken이 있으면 Authorization 헤더를 자동으로 붙인다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'token-123', refreshToken: 'r', user: null });
    mockFetchOnce({ status: 200, json: { ok: true } });

    await apiClient.get('/mypage/profile');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer token-123');
  });

  it('accessToken이 없으면 Authorization 헤더를 붙이지 않는다', async () => {
    mockFetchOnce({ status: 200, json: [] });

    await apiClient.get('/events', { auth: false });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('auth:false 옵션이면 토큰이 있어도 Authorization 헤더를 붙이지 않는다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'token-abc', refreshToken: 'r', user: null });
    mockFetchOnce({ status: 200, json: { accessToken: 'x', refreshToken: 'y' } });

    await apiClient.post('/auth/login', { email: 'a@b.com', password: 'pw' }, { auth: false });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('body가 있으면 JSON으로 직렬화하고 Content-Type을 설정한다', async () => {
    mockFetchOnce({ status: 201, json: { id: '1' } });

    await apiClient.post('/events', { title: '이벤트' });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ title: '이벤트' });
  });

  it('204 응답은 null을 반환한다', async () => {
    mockFetchOnce({ status: 204, json: null });

    const result = await apiClient.delete('/events/1');

    expect(result).toBeNull();
  });

  it('실패 응답은 error.code/message를 담은 Error를 던진다', async () => {
    mockFetchOnce({
      status: 409,
      json: { error: { code: 'DUPLICATE_ENTRY', message: '이미 신청했습니다.' } },
    });

    await expect(apiClient.post('/events/1/entries', { consent: true })).rejects.toMatchObject({
      code: 'DUPLICATE_ENTRY',
      message: '이미 신청했습니다.',
      status: 409,
    });
  });

  it('getBlob은 파일(Blob)을 반환한다', async () => {
    mockFetchOnce({ status: 200, headers: { 'content-type': 'text/csv' } });

    const blob = await apiClient.getBlob('/events/1/entries/export');

    expect(blob).toBeInstanceOf(Blob);
  });
});

function jsonResponse(status, json) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(json),
  };
}

describe('apiClient 401 인터셉터 · silent refresh', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('Access 만료(401) 시 자동으로 Refresh 후 원 요청을 1회 재시도해 성공한다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'expired', refreshToken: 'refresh-1', user: { id: 'u1' } });

    let profileCallCount = 0;
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve(jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }));
      }
      profileCallCount += 1;
      if (profileCallCount === 1) return Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } }));
      return Promise.resolve(jsonResponse(200, { id: 'u1' }));
    });

    const result = await apiClient.get('/mypage/profile');

    expect(result).toEqual({ id: 'u1' });
    expect(useAuthStore.getState().accessToken).toBe('new-access');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh');

    const retriedCall = global.fetch.mock.calls.find(
      ([url], index) => url.endsWith('/mypage/profile') && index === global.fetch.mock.calls.length - 1,
    );
    expect(retriedCall[1].headers.Authorization).toBe('Bearer new-access');
  });

  it('동시에 여러 요청이 401을 받아도 /auth/refresh는 1번만 호출된다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'expired', refreshToken: 'refresh-1', user: null });

    let refreshCallCount = 0;
    const protectedCallCounts = {};
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCallCount += 1;
        return Promise.resolve(jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }));
      }
      protectedCallCounts[url] = (protectedCallCounts[url] || 0) + 1;
      if (protectedCallCounts[url] === 1) return Promise.resolve(jsonResponse(401, { error: {} }));
      return Promise.resolve(jsonResponse(200, { ok: true }));
    });

    await Promise.all([
      apiClient.get('/mypage/profile'),
      apiClient.get('/mypage/entries'),
      apiClient.get('/events/1'),
    ]);

    expect(refreshCallCount).toBe(1);
  });

  it('Refresh 재발급까지 실패하면 비로그인 상태로 전환되고 원래 401 에러를 던진다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'expired', refreshToken: 'invalid-refresh', user: { id: 'u1' } });

    global.fetch = vi.fn((url) => {
      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: '재발급 실패' } }));
      }
      return Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }));
    });

    await expect(apiClient.get('/mypage/profile')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('refreshToken이 아예 없으면 401을 받아도 재발급을 시도하지 않는다', async () => {
    global.fetch = vi.fn(() => Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } })));

    await expect(apiClient.get('/mypage/profile')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('auth:false 요청은 401을 받아도 재발급을 시도하지 않는다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: null });
    global.fetch = vi.fn(() => Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } })));

    await expect(apiClient.post('/auth/login', { email: 'a@b.com', password: 'x' }, { auth: false })).rejects.toMatchObject(
      { code: 'UNAUTHORIZED' },
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('쿠키를 사용하지 않는다(credentials 옵션을 지정하지 않음)', async () => {
    mockFetchOnce({ status: 200, json: { ok: true } });
    await apiClient.get('/events', { auth: false });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.credentials).toBeUndefined();
  });
});
