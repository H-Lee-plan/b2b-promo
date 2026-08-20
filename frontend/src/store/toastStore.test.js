import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore, showError, showSuccess } from './toastStore.js';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.getState().hideToast();
  });

  it('showToast/hideToast로 toast 상태를 직접 제어할 수 있다', () => {
    useToastStore.getState().showToast({ code: 'X', message: '메시지', variant: 'error' });
    expect(useToastStore.getState().toast).toEqual({ code: 'X', message: '메시지', variant: 'error' });

    useToastStore.getState().hideToast();
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('showError는 error.code/error.message를 그대로 담아 variant=error로 표시한다', () => {
    showError({ code: 'DUPLICATE_ENTRY', message: '이미 신청했습니다.' });
    expect(useToastStore.getState().toast).toEqual({
      code: 'DUPLICATE_ENTRY',
      message: '이미 신청했습니다.',
      variant: 'error',
    });
  });

  it('showError는 code/message가 없는 에러도 기본값으로 안전하게 표시한다(INTERNAL_ERROR 대체)', () => {
    showError(new Error());
    const { toast } = useToastStore.getState();
    expect(toast.code).toBe('INTERNAL_ERROR');
    expect(toast.message).toBe('서버 오류가 발생했습니다.');
    expect(toast.variant).toBe('error');
  });

  it('showSuccess는 variant=success로 표시하고 code는 없다', () => {
    showSuccess('저장되었습니다.');
    expect(useToastStore.getState().toast).toEqual({
      code: null,
      message: '저장되었습니다.',
      variant: 'success',
    });
  });
});
