import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bootstrapAuth } from './main.jsx';
import { authApi } from './api/authApi.js';
import { useAuthStore } from './store/authStore.js';

vi.mock('./api/authApi.js', () => ({ authApi: { refresh: vi.fn() } }));
vi.mock('./api/eventsApi.js', () => ({ eventsApi: { list: vi.fn().mockResolvedValue([]) } }));

describe('bootstrapAuth (부팅 시 silent refresh)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  it('저장된 refreshToken이 있으면 재발급을 시도하고, 성공하면 토큰을 갱신하되 user는 유지한다', async () => {
    useAuthStore.setState({ accessToken: 'old-access', refreshToken: 'r1', user: { name: '김담당' } });
    authApi.refresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });

    await bootstrapAuth();

    expect(authApi.refresh).toHaveBeenCalledWith('r1');
    expect(useAuthStore.getState().accessToken).toBe('new-access');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
    expect(useAuthStore.getState().user).toEqual({ name: '김담당' });
  });

  it('refreshToken이 없으면 재발급을 시도하지 않는다(비로그인 상태로 시작)', async () => {
    await bootstrapAuth();
    expect(authApi.refresh).not.toHaveBeenCalled();
  });

  it('재발급까지 실패하면 비로그인 상태로 전환된다', async () => {
    useAuthStore.setState({ accessToken: 'old-access', refreshToken: 'invalid', user: { name: '김담당' } });
    authApi.refresh.mockRejectedValue(Object.assign(new Error('재발급 실패'), { code: 'UNAUTHORIZED' }));

    await bootstrapAuth();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('재발급이 끝나기 전까지 완료되지 않는다(main.jsx가 이 Promise 완료 후에만 렌더링하도록 보장)', async () => {
    useAuthStore.setState({ accessToken: 'old-access', refreshToken: 'r1', user: { name: '김' } });
    let resolveRefresh;
    authApi.refresh.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    let settled = false;
    const promise = bootstrapAuth().then(() => {
      settled = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveRefresh({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    await promise;
    expect(settled).toBe(true);
  });
});
