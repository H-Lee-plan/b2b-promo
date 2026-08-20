import { describe, it, expect, beforeEach } from 'vitest';
import { queryClient } from './queryClient.js';
import { useToastStore } from '../store/toastStore.js';

describe('queryClient 전역 에러 처리', () => {
  beforeEach(() => {
    useToastStore.getState().hideToast();
    queryClient.clear();
  });

  it('쿼리 실패 시 error.code/message가 그대로 Toast 스토어에 반영된다', async () => {
    const error = Object.assign(new Error('참여신청을 찾을 수 없습니다.'), { code: 'VALIDATION_ERROR' });

    await queryClient
      .fetchQuery({
        queryKey: ['fails-once'],
        queryFn: () => Promise.reject(error),
        retry: false,
      })
      .catch(() => {});

    expect(useToastStore.getState().toast).toEqual({
      code: 'VALIDATION_ERROR',
      message: '참여신청을 찾을 수 없습니다.',
      variant: 'error',
    });
  });

  it('뮤테이션 실패 시에도 동일하게 Toast 스토어에 반영된다', async () => {
    const error = Object.assign(new Error('이미 종료된 이벤트입니다.'), { code: 'EVENT_CLOSED' });

    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(error) })
      .execute()
      .catch(() => {});

    expect(useToastStore.getState().toast).toEqual({
      code: 'EVENT_CLOSED',
      message: '이미 종료된 이벤트입니다.',
      variant: 'error',
    });
  });
});
