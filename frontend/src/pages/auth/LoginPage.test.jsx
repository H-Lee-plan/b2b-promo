import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './LoginPage.jsx';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { queryClient } from '../../lib/queryClient.js';

vi.mock('../../api/authApi.js', () => ({ authApi: { login: vi.fn() } }));

function renderPage() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>이벤트 목록 화면</div>} />
          <Route path="/signup" element={<div>회원가입 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useToastStore.getState().hideToast();
    vi.clearAllMocks();
  });

  it('로그인 성공 시 토큰을 저장하고 이벤트 목록으로 이동한다', async () => {
    authApi.login.mockResolvedValue({
      accessToken: 'a1',
      refreshToken: 'r1',
      user: { id: 'u1', role: 'MEMBER' },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@example.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await screen.findByText('이벤트 목록 화면');
    expect(useAuthStore.getState().accessToken).toBe('a1');
  });

  it('로그인 실패 시 이메일/비밀번호 중 무엇이 틀렸는지 구분하지 않는 일반 메시지를 그대로 표시한다', async () => {
    authApi.login.mockRejectedValue(
      Object.assign(new Error('이메일 또는 비밀번호가 올바르지 않습니다.'), { code: 'UNAUTHORIZED', status: 401 }),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@example.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() =>
      expect(useToastStore.getState().toast?.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.'),
    );
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(screen.queryByText('이벤트 목록 화면')).not.toBeInTheDocument();
  });

  it('회원가입 링크를 클릭하면 회원가입 화면으로 이동한다', () => {
    renderPage();
    fireEvent.click(screen.getByRole('link', { name: '회원가입' }));
    expect(screen.getByText('회원가입 화면')).toBeInTheDocument();
  });
});
