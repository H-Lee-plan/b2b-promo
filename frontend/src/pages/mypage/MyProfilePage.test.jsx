import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import MyProfilePage from './MyProfilePage.jsx';
import { mypageApi } from '../../api/mypageApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { queryClient } from '../../lib/queryClient.js';

vi.mock('../../api/mypageApi.js', () => ({
  mypageApi: { getProfile: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn() },
}));

function renderPage() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/mypage/profile']}>
        <Routes>
          <Route path="/mypage" element={<div>참여 내역 화면</div>} />
          <Route path="/mypage/profile" element={<MyProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MyProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.getState().hideToast();
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김담당' } });
    mypageApi.getProfile.mockResolvedValue({
      companyName: 'OO식자재',
      name: '김담당',
      phone: '010-1234-5678',
    });
  });

  it('조회한 내 정보로 폼이 채워진다', async () => {
    renderPage();
    expect(await screen.findByDisplayValue('OO식자재')).toBeInTheDocument();
    expect(screen.getByDisplayValue('김담당')).toBeInTheDocument();
    expect(screen.getByDisplayValue('010-1234-5678')).toBeInTheDocument();
  });

  it('내 정보 수정이 성공하면 authStore의 user가 갱신된다', async () => {
    mypageApi.updateProfile.mockResolvedValue({
      companyName: 'OO식자재(수정)',
      name: '김담당',
      phone: '010-1234-5678',
    });
    renderPage();
    await screen.findByDisplayValue('OO식자재');

    fireEvent.change(screen.getByLabelText('업체명'), { target: { value: 'OO식자재(수정)' } });
    fireEvent.click(screen.getByRole('button', { name: '정보 저장' }));

    await waitFor(() =>
      expect(mypageApi.updateProfile).toHaveBeenCalledWith({
        companyName: 'OO식자재(수정)',
        name: '김담당',
        phone: '010-1234-5678',
      }),
    );
    await waitFor(() => expect(useAuthStore.getState().user.companyName).toBe('OO식자재(수정)'));
  });

  it('비밀번호 변경 시 8자 미만이면 안내가 표시되고 제출이 막힌다', async () => {
    renderPage();
    await screen.findByDisplayValue('OO식자재');

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: '1234567' } });
    expect(screen.getByText('비밀번호는 8자 이상이어야 합니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeDisabled();
  });

  it('비밀번호 변경이 성공하면 입력값이 초기화된다', async () => {
    mypageApi.changePassword.mockResolvedValue({ ok: true });
    renderPage();
    await screen.findByDisplayValue('OO식자재');

    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'oldpassword1' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newpassword1' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() =>
      expect(mypageApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpassword1',
        newPassword: 'newpassword1',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText('새 비밀번호').value).toBe(''));
  });

  it('← 참여 내역 링크 클릭 시 목록 화면으로 이동한다', async () => {
    renderPage();
    await screen.findByDisplayValue('OO식자재');
    fireEvent.click(screen.getByRole('link', { name: '← 참여 내역' }));
    expect(await screen.findByText('참여 내역 화면')).toBeInTheDocument();
  });
});
