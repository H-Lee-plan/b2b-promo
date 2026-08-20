import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';
import '../../styles/button.css';

export default function MyEntriesPage() {
  const navigate = useNavigate();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  function handleLogout() {
    authApi.logout(refreshToken).finally(() => {
      clearAuth();
      navigate('/login', { replace: true });
    });
  }

  return (
    <div>
      <p>마이페이지</p>
      <button type="button" className="button button--secondary" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}
