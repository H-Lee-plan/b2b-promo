import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { mypageApi } from '../../api/mypageApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { showSuccess } from '../../store/toastStore.js';
import '../../styles/button.css';
import './MyProfilePage.css';

const MIN_PASSWORD_LENGTH = 8;

export default function MyProfilePage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setAuth = useAuthStore((state) => state.setAuth);

  const profileQuery = useQuery({ queryKey: ['mypage', 'profile'], queryFn: mypageApi.getProfile });

  const [profileForm, setProfileForm] = useState({ companyName: '', name: '', phone: '' });

  useEffect(() => {
    if (!profileQuery.data) return;
    const { companyName, name, phone } = profileQuery.data;
    setProfileForm({ companyName, name, phone });
  }, [profileQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => mypageApi.updateProfile(data),
    onSuccess: (user) => {
      setAuth({ accessToken, refreshToken, user });
      showSuccess('내 정보가 수정되었습니다.');
    },
  });

  function updateProfileField(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    updateProfileMutation.mutate(profileForm);
  }

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const passwordError =
    passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < MIN_PASSWORD_LENGTH
      ? `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
      : null;

  const changePasswordMutation = useMutation({
    mutationFn: (data) => mypageApi.changePassword(data),
    onSuccess: () => {
      showSuccess('비밀번호가 변경되었습니다.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    },
  });

  function updatePasswordField(field, value) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();
    if (passwordError) return;
    changePasswordMutation.mutate(passwordForm);
  }

  return (
    <div className="my-profile">
      <Link to="/mypage">← 참여 내역</Link>
      <h1>내 정보</h1>

      <form onSubmit={handleProfileSubmit}>
        <label>
          업체명
          <input
            value={profileForm.companyName}
            onChange={(event) => updateProfileField('companyName', event.target.value)}
            required
          />
        </label>
        <label>
          담당자명
          <input value={profileForm.name} onChange={(event) => updateProfileField('name', event.target.value)} required />
        </label>
        <label>
          연락처
          <input value={profileForm.phone} onChange={(event) => updateProfileField('phone', event.target.value)} required />
        </label>
        <button type="submit" className="button button--primary" disabled={updateProfileMutation.isPending}>
          정보 저장
        </button>
      </form>

      <h2>비밀번호 변경</h2>
      <form onSubmit={handlePasswordSubmit}>
        <label>
          현재 비밀번호
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
            required
          />
        </label>
        <label>
          새 비밀번호
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => updatePasswordField('newPassword', event.target.value)}
            required
          />
          {passwordError && <p className="field-error">{passwordError}</p>}
        </label>
        <button
          type="submit"
          className="button button--primary"
          disabled={changePasswordMutation.isPending || Boolean(passwordError)}
        >
          비밀번호 변경
        </button>
      </form>
    </div>
  );
}
