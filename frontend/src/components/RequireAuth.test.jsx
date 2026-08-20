import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAuth from './RequireAuth.jsx';
import { useAuthStore } from '../store/authStore.js';

function renderWithGuard() {
  return render(
    <MemoryRouter initialEntries={['/mypage']}>
      <Routes>
        <Route path="/login" element={<div>로그인 화면</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/mypage" element={<div>마이페이지 화면</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('로그인하지 않은 경우 /login으로 리다이렉트한다', () => {
    renderWithGuard();
    expect(screen.getByText('로그인 화면')).toBeInTheDocument();
  });

  it('accessToken이 있으면 자식 라우트를 렌더링한다', () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { role: 'MEMBER' } });
    renderWithGuard();
    expect(screen.getByText('마이페이지 화면')).toBeInTheDocument();
  });
});
