import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import Toast from './components/Toast.jsx';
import { queryClient } from './lib/queryClient.js';
import { useAuthStore } from './store/authStore.js';
import { authApi } from './api/authApi.js';
import './styles/tokens.css';

// 부팅 시 저장된 Refresh Token으로 재발급을 먼저 시도한다(silent refresh).
// 이 Promise가 끝날 때까지 앱을 렌더링하지 않아 로그인 상태가 확정되기 전에 라우팅이 일어나지 않게 한다.
export async function bootstrapAuth() {
  const { refreshToken, user, setAuth, clearAuth } = useAuthStore.getState();
  if (!refreshToken) return;

  try {
    const tokens = await authApi.refresh(refreshToken);
    setAuth({ ...tokens, user });
  } catch {
    clearAuth();
  }
}

function renderApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toast />
      </QueryClientProvider>
    </StrictMode>,
  );
}

bootstrapAuth().then(renderApp);
