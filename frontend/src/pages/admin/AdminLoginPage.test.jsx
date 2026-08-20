import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import AdminLoginPage from './AdminLoginPage.jsx';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';

vi.mock('../../api/authApi.js', () => ({ authApi: { login: vi.fn() } }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/events" element={<div>관리자 이벤트 목록</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useToastStore.getState().hideToast();
    vi.clearAllMocks();
  });

  it('이메일/비밀번호 입력 후 제출하면 authApi.login이 호출된다', async () => {
    authApi.login.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u1', role: 'ADMIN' },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'admin@onlyoneevent.local' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'admin@onlyoneevent.local',
        password: 'password1234',
      }),
    );
  });

  it('ADMIN 계정으로 로그인 성공 시 토큰을 저장하고 이벤트 목록으로 이동한다', async () => {
    authApi.login.mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'u1', role: 'ADMIN' },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'admin@onlyoneevent.local' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await screen.findByText('관리자 이벤트 목록');
    expect(useAuthStore.getState().accessToken).toBe('access-1');
    expect(useAuthStore.getState().user).toEqual({ id: 'u1', role: 'ADMIN' });
  });

  it('MEMBER 계정으로 로그인하면 거부하고 토큰을 저장하지 않는다', async () => {
    authApi.login.mockResolvedValue({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      user: { id: 'u2', role: 'MEMBER' },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@example.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1234' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => expect(useToastStore.getState().toast?.code).toBe('FORBIDDEN'));
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(screen.queryByText('관리자 이벤트 목록')).not.toBeInTheDocument();
  });
});
