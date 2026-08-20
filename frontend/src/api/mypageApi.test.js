import { describe, it, expect, vi } from 'vitest';
import { apiClient } from './client.js';
import { mypageApi } from './mypageApi.js';

vi.mock('./client.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), getBlob: vi.fn() },
}));

describe('mypageApi', () => {
  it('getEntries는 /mypage/entries를 조회한다', () => {
    mypageApi.getEntries();
    expect(apiClient.get).toHaveBeenCalledWith('/mypage/entries');
  });

  it('cancelEntry는 /mypage/entries/:entryId/cancel에 POST한다', () => {
    mypageApi.cancelEntry('entry1');
    expect(apiClient.post).toHaveBeenCalledWith('/mypage/entries/entry1/cancel');
  });

  it('getProfile은 /mypage/profile을 조회한다', () => {
    mypageApi.getProfile();
    expect(apiClient.get).toHaveBeenCalledWith('/mypage/profile');
  });

  it('updateProfile은 /mypage/profile에 PATCH한다', () => {
    const data = { companyName: 'C', name: 'N', phone: 'P' };
    mypageApi.updateProfile(data);
    expect(apiClient.patch).toHaveBeenCalledWith('/mypage/profile', data);
  });

  it('changePassword는 /mypage/password에 PATCH한다', () => {
    const data = { currentPassword: 'a', newPassword: 'b' };
    mypageApi.changePassword(data);
    expect(apiClient.patch).toHaveBeenCalledWith('/mypage/password', data);
  });
});
