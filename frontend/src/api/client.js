import { useAuthStore } from '../store/authStore.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

let refreshPromise = null;

function authHeader() {
  const accessToken = useAuthStore.getState().accessToken;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function toApiError(response) {
  const data = await response.json().catch(() => null);
  const error = new Error(data?.error?.message || '요청 처리 중 오류가 발생했습니다.');
  error.code = data?.error?.code;
  error.status = response.status;
  return error;
}

// 동시에 여러 요청이 401을 받아도 재발급은 1번만 일어나도록 진행 중인 재발급 Promise를 공유한다.
function refreshAccessToken() {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return Promise.resolve(false);

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) throw await toApiError(response);
        return response.json();
      })
      .then((tokens) => {
        useAuthStore.getState().setTokens(tokens);
        return true;
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function authorizedFetch(path, fetchOptions, auth, retried = false) {
  const headers = { ...(auth ? authHeader() : {}), ...(fetchOptions.headers || {}) };
  const response = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  if (response.status === 401 && auth && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return authorizedFetch(path, fetchOptions, auth, true);
  }

  return response;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await authorizedFetch(
    path,
    { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined },
    auth,
  );

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return null;
  return response.json();
}

async function requestBlob(path, { auth = true } = {}) {
  const response = await authorizedFetch(path, {}, auth);
  if (!response.ok) throw await toApiError(response);
  return response.blob();
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  getBlob: (path, options) => requestBlob(path, options),
};
