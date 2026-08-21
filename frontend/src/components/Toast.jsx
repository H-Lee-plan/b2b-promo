import { useEffect, useState } from 'react';
import { useToastStore } from '../store/toastStore.js';
import './Toast.css';

const AUTO_DISMISS_MS = 4000;

export default function Toast() {
  const toast = useToastStore((state) => state.toast);
  const hideToast = useToastStore((state) => state.hideToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(hideToast, AUTO_DISMISS_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.variant}${visible ? ' toast--visible' : ''}`} role="alert">
      <span className="toast__message">{toast.message}</span>
      <button type="button" className="toast__close" onClick={hideToast} aria-label="닫기">
        ×
      </button>
    </div>
  );
}
