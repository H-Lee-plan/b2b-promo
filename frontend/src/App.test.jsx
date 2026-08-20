import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { eventsApi } from './api/eventsApi.js';
import { queryClient } from './lib/queryClient.js';

vi.mock('./api/eventsApi.js', () => ({ eventsApi: { list: vi.fn() } }));

describe('App', () => {
  beforeEach(() => {
    queryClient.clear();
    eventsApi.list.mockResolvedValue([]);
  });

  it('기본 경로(/)에서 참여자 이벤트 목록 라우트가 렌더링된다', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('온리원이벤트')).toBeInTheDocument();
  });
});
