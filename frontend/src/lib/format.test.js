import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDateTime, formatDday } from './format.js';

describe('formatDateTime', () => {
  it('ISO 문자열을 MM-DD HH:mm 형식으로 변환한다', () => {
    const date = new Date(2026, 7, 13, 10, 2); // 로컬 타임존 기준 2026-08-13 10:02
    expect(formatDateTime(date.toISOString())).toBe('08-13 10:02');
  });

  it('한 자리 월/일/시/분도 0으로 채운다', () => {
    const date = new Date(2026, 0, 5, 9, 3);
    expect(formatDateTime(date.toISOString())).toBe('01-05 09:03');
  });

  it('값이 없으면 -를 반환한다', () => {
    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
  });
});

describe('formatDday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 13, 0, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CLOSED 상태면 endAt과 무관하게 "마감됨"을 반환한다', () => {
    expect(formatDday(new Date(2026, 7, 20).toISOString(), 'CLOSED')).toBe('마감됨');
  });

  it('마감까지 남은 일수를 D-N 형식으로 반환한다', () => {
    expect(formatDday(new Date(2026, 7, 15).toISOString(), 'ONGOING')).toBe('D-2 마감');
  });

  it('마감이 오늘이거나 지났으면 "오늘 마감"을 반환한다', () => {
    expect(formatDday(new Date(2026, 7, 13, 23, 59).toISOString(), 'ONGOING')).toBe('오늘 마감');
  });
});
