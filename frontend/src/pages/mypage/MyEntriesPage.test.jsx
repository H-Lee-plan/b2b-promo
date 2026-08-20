import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MyEntriesPage from './MyEntriesPage.jsx';
import RequireAuth from '../../components/RequireAuth.jsx';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';

vi.mock('../../api/authApi.js', () => ({ authApi: { logout: vi.fn() } }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/mypage']}>
      <Routes>
        <Route path="/login" element={<div>로그인 화면</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/mypage" element={<MyEntriesPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('MyEntriesPage 로그아웃', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.logout.mockResolvedValue(null);
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { role: 'MEMBER' } });
  });

  it('로그아웃 클릭 시 토큰이 지워지고 로그인 화면으로 이동해 이후 /mypage 접근이 차단된다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(authApi.logout).toHaveBeenCalledWith('r'));
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();

    // 로그아웃 후 재진입 시도 → RequireAuth가 다시 차단
    const { unmount } = renderPage();
    expect(screen.getAllByText('로그인 화면').length).toBeGreaterThan(0);
    unmount();
  });
});
