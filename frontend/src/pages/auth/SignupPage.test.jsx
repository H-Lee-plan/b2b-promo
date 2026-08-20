import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import SignupPage from './SignupPage.jsx';
import { authApi } from '../../api/authApi.js';
import { useToastStore } from '../../store/toastStore.js';
import { queryClient } from '../../lib/queryClient.js';

vi.mock('../../api/authApi.js', () => ({ authApi: { signup: vi.fn() } }));

function renderPage() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<div>로그인 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1' } });
  fireEvent.change(screen.getByLabelText('업체명'), { target: { value: 'OO식자재' } });
  fireEvent.change(screen.getByLabelText('담당자명'), { target: { value: '김담당' } });
  fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-1234-5678' } });
}

describe('SignupPage', () => {
  beforeEach(() => {
    useToastStore.getState().hideToast();
    vi.clearAllMocks();
  });

  it('비밀번호 8자 미만 입력 시 제출 전 안내가 표시되고 제출 버튼이 막힌다', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: '1234567' } });
    expect(screen.getByText('비밀번호는 8자 이상이어야 합니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회원가입' })).toBeDisabled();
  });

  it('유효한 정보 제출 시 authApi.signup이 호출되고 성공하면 로그인 화면으로 이동한다', async () => {
    authApi.signup.mockResolvedValue({ id: 'u1', role: 'MEMBER' });
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() =>
      expect(authApi.signup).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password1',
        companyName: 'OO식자재',
        name: '김담당',
        phone: '010-1234-5678',
      }),
    );
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  });

  it('중복 이메일 가입 시도 시 "이미 가입된 이메일입니다" 메시지가 뜬다', async () => {
    authApi.signup.mockRejectedValue(
      Object.assign(new Error('이미 가입된 이메일입니다.'), { code: 'VALIDATION_ERROR', status: 400 }),
    );
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => expect(useToastStore.getState().toast?.message).toBe('이미 가입된 이메일입니다.'));
    expect(screen.queryByText('로그인 화면')).not.toBeInTheDocument();
  });
});
