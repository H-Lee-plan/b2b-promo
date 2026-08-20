import { describe, it, expect, vi } from 'vitest';
import { apiClient } from './client.js';
import { authApi } from './authApi.js';

vi.mock('./client.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), getBlob: vi.fn() },
}));

describe('authApi', () => {
  it('signup은 /auth/signup에 auth:false로 요청한다', () => {
    const data = { email: 'a@b.com', password: 'password1', companyName: 'C', name: 'N', phone: '010' };
    authApi.signup(data);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/signup', data, { auth: false });
  });

  it('login은 /auth/login에 auth:false로 요청한다', () => {
    const data = { email: 'a@b.com', password: 'password1' };
    authApi.login(data);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', data, { auth: false });
  });

  it('refresh는 /auth/refresh에 refreshToken을 담아 auth:false로 요청한다', () => {
    authApi.refresh('r-token');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'r-token' }, { auth: false });
  });

  it('logout은 /auth/logout에 refreshToken을 담아 auth:false로 요청한다', () => {
    authApi.logout('r-token');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'r-token' }, { auth: false });
  });
});
