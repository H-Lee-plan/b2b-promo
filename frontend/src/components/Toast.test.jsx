import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Toast from './Toast.jsx';
import { useToastStore, showError, showSuccess } from '../store/toastStore.js';

describe('Toast', () => {
  beforeEach(() => {
    useToastStore.getState().hideToast();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toast가 없으면 아무것도 렌더링하지 않는다', () => {
    render(<Toast />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('7종 에러 코드 모두 동일한 Toast(공통 alert)로 message를 표시한다', () => {
    const codes = [
      'DUPLICATE_ENTRY',
      'TARGET_TYPE_MISMATCH',
      'EVENT_CLOSED',
      'CONSENT_REQUIRED',
      'EVENT_HAS_ENTRIES',
      'VALIDATION_ERROR',
      'INTERNAL_ERROR',
    ];

    codes.forEach((code) => {
      const { unmount } = render(<Toast />);
      act(() => showError({ code, message: `${code} 메시지` }));
      expect(screen.getByRole('alert')).toHaveTextContent(`${code} 메시지`);
      unmount();
      act(() => useToastStore.getState().hideToast());
    });
  });

  it('INTERNAL_ERROR 발생 시 message만 표시하고 스택 등 내부 정보는 노출하지 않는다', () => {
    render(<Toast />);
    const internalError = Object.assign(new Error('서버 오류가 발생했습니다.'), { code: 'INTERNAL_ERROR' });
    act(() => showError(internalError));

    const alertEl = screen.getByRole('alert');
    expect(alertEl).toHaveTextContent('서버 오류가 발생했습니다.');
    expect(alertEl.textContent).not.toContain('at ');
    expect(alertEl.textContent).not.toContain(internalError.stack);
  });

  it('에러 Toast는 닫기 버튼으로 즉시 닫을 수 있다', () => {
    render(<Toast />);
    act(() => showError({ code: 'DUPLICATE_ENTRY', message: '중복 신청' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('에러 Toast도 4초 후 자동으로 닫힌다', () => {
    vi.useFakeTimers();
    render(<Toast />);
    act(() => showError({ code: 'DUPLICATE_ENTRY', message: '중복 신청' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('성공 Toast는 4초 후 자동으로 닫힌다', () => {
    vi.useFakeTimers();
    render(<Toast />);
    act(() => showSuccess('저장되었습니다.'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
