import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toast: null, // { code, message, variant: 'error' | 'success' } | null
  showToast: (toast) => set({ toast }),
  hideToast: () => set({ toast: null }),
}));

export function showError(error) {
  useToastStore.getState().showToast({
    code: error?.code || 'INTERNAL_ERROR',
    message: error?.message || '서버 오류가 발생했습니다.',
    variant: 'error',
  });
}

export function showSuccess(message) {
  useToastStore.getState().showToast({ code: null, message, variant: 'success' });
}
