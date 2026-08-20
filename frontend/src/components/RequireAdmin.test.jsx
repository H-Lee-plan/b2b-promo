import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAdmin from './RequireAdmin.jsx';
import { useAuthStore } from '../store/authStore.js';

function renderWithGuard() {
  return render(
    <MemoryRouter initialEntries={['/admin/events']}>
      <Routes>
        <Route path="/admin/login" element={<div>관리자 로그인 화면</div>} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin/events" element={<div>관리자 이벤트 목록</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('로그인하지 않은 경우 /admin/login으로 리다이렉트한다', () => {
    renderWithGuard();
    expect(screen.getByText('관리자 로그인 화면')).toBeInTheDocument();
  });

  it('MEMBER role로는 접근할 수 없고 /admin/login으로 리다이렉트한다', () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { role: 'MEMBER' } });
    renderWithGuard();
    expect(screen.getByText('관리자 로그인 화면')).toBeInTheDocument();
  });

  it('ADMIN role이면 자식 라우트를 렌더링한다', () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { role: 'ADMIN' } });
    renderWithGuard();
    expect(screen.getByText('관리자 이벤트 목록')).toBeInTheDocument();
  });
});
