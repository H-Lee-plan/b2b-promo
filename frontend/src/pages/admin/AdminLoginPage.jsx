import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { showError } from '../../store/toastStore.js';
import '../../styles/button.css';
import './AdminLoginPage.css';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const loginMutation = useMutation({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: (data) => {
      if (data.user.role !== 'ADMIN') {
        showError({ code: 'FORBIDDEN', message: '관리자 계정으로만 로그인할 수 있습니다.' });
        return;
      }
      setAuth(data);
      navigate('/admin/events', { replace: true });
    },
  });

  function handleSubmit(event) {
    event.preventDefault();
    loginMutation.mutate({ email, password });
  }

  return (
    <div className="admin-login">
      <h1>온리원이벤트 관리자</h1>
      <form onSubmit={handleSubmit}>
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="button button--primary" disabled={loginMutation.isPending}>
          로그인
        </button>
      </form>
    </div>
  );
}
