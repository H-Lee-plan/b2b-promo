import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// jsdom은 matchMedia를 구현하지 않는다 — prefers-reduced-motion 등 미디어 쿼리 체크에 필요
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// main.jsx가 부팅 시 createRoot(document.getElementById('root'))를 호출하므로 항상 존재하게 한다
if (!document.getElementById('root')) {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
}

afterEach(() => {
  cleanup();
});
