import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore.js';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
  });

  it('setAuth로 토큰과 사용자 정보를 저장한다', () => {
    useAuthStore.getState().setAuth({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'u1', role: 'MEMBER' },
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
    expect(state.user).toEqual({ id: 'u1', role: 'MEMBER' });
  });

  it('설정된 토큰이 localStorage(persist)에 저장되어 새로고침 후에도 남는다', () => {
    useAuthStore.getState().setAuth({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      user: { id: 'u2', role: 'ADMIN' },
    });

    const persisted = JSON.parse(localStorage.getItem('auth-storage'));
    expect(persisted.state.accessToken).toBe('access-2');
    expect(persisted.state.refreshToken).toBe('refresh-2');
    expect(persisted.state.user).toEqual({ id: 'u2', role: 'ADMIN' });
  });

  it('clearAuth로 토큰과 사용자 정보를 모두 비운다', () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { id: 'u' } });
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setTokens로 user는 그대로 두고 토큰만 교체한다', () => {
    useAuthStore.getState().setAuth({ accessToken: 'old-a', refreshToken: 'old-r', user: { id: 'u1' } });
    useAuthStore.getState().setTokens({ accessToken: 'new-a', refreshToken: 'new-r' });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-a');
    expect(state.refreshToken).toBe('new-r');
    expect(state.user).toEqual({ id: 'u1' });
  });

  it('서버 데이터(이벤트·참여신청 목록 등)를 위한 필드를 두지 않는다', () => {
    const state = useAuthStore.getState();
    const keys = Object.keys(state);
    expect(keys).toEqual(
      expect.arrayContaining(['accessToken', 'refreshToken', 'user', 'setAuth', 'clearAuth']),
    );
    expect(keys).not.toEqual(expect.arrayContaining(['events', 'entries']));
  });
});
