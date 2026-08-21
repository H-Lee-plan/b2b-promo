import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { FIELD_MAX_LENGTH, isValidEmail } from '../../lib/validators.js';
import '../../styles/button.css';
import './AuthPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const emailError = email.length > 0 && !isValidEmail(email) ? '올바른 이메일 형식이 아닙니다.' : null;

  const loginMutation = useMutation({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setAuth(data);
      navigate(location.state?.from ?? '/', { replace: true });
    },
  });

  function handleSubmit(event) {
    event.preventDefault();
    if (emailError) return;
    loginMutation.mutate({ email, password });
  }

  return (
    <div className="auth-page">
      <h1>로그인</h1>
      <form onSubmit={handleSubmit}>
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            placeholder="example@company.com"
            maxLength={FIELD_MAX_LENGTH.email}
            required
          />
          {emailError && <p className="field-error">{emailError}</p>}
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="비밀번호 입력"
            maxLength={FIELD_MAX_LENGTH.password}
            required
          />
        </label>
        <button type="submit" className="button button--primary" disabled={loginMutation.isPending || Boolean(emailError)}>
          로그인
        </button>
      </form>
      <p>
        아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
      </p>
    </div>
  );
}
