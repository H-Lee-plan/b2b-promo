import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/authApi.js';
import { showSuccess } from '../../store/toastStore.js';
import { FIELD_MAX_LENGTH, isValidEmail, isValidPhone, sanitizePhoneInput } from '../../lib/validators.js';
import '../../styles/button.css';
import './AuthPage.css';

const MIN_PASSWORD_LENGTH = 8;

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', companyName: '', name: '', phone: '' });
  const navigate = useNavigate();

  const emailError = form.email.length > 0 && !isValidEmail(form.email) ? '올바른 이메일 형식이 아닙니다.' : null;
  const passwordError =
    form.password.length > 0 && form.password.length < MIN_PASSWORD_LENGTH
      ? `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
      : null;
  const phoneError = form.phone.length > 0 && !isValidPhone(form.phone) ? '연락처는 숫자 10~11자리로 입력해주세요.' : null;
  const hasError = Boolean(emailError || passwordError || phoneError);

  const signupMutation = useMutation({
    mutationFn: (data) => authApi.signup(data),
    onSuccess: () => {
      showSuccess('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login', { replace: true });
    },
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (hasError) return;
    signupMutation.mutate(form);
  }

  return (
    <div className="auth-page">
      <h1>회원가입</h1>
      <form onSubmit={handleSubmit}>
        <label>
          이메일
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
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
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            autoComplete="new-password"
            placeholder="8자 이상 입력해주세요"
            maxLength={FIELD_MAX_LENGTH.password}
            required
          />
          {passwordError && <p className="field-error">{passwordError}</p>}
        </label>
        <label>
          업체명
          <input
            value={form.companyName}
            onChange={(event) => updateField('companyName', event.target.value)}
            placeholder="예: 온리원상사"
            maxLength={FIELD_MAX_LENGTH.companyName}
            required
          />
        </label>
        <label>
          담당자명
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="예: 홍길동"
            maxLength={FIELD_MAX_LENGTH.name}
            required
          />
        </label>
        <label>
          연락처
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(event) => updateField('phone', sanitizePhoneInput(event.target.value))}
            placeholder="숫자만 입력 (예: 01012345678)"
            required
          />
          {phoneError && <p className="field-error">{phoneError}</p>}
        </label>
        <button type="submit" className="button button--primary" disabled={signupMutation.isPending || hasError}>
          회원가입
        </button>
      </form>
      <p>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}
