import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EventListPage from './EventListPage.jsx';
import { eventsApi } from '../../api/eventsApi.js';
import { useAuthStore } from '../../store/authStore.js';

vi.mock('../../api/eventsApi.js', () => ({ eventsApi: { list: vi.fn() } }));

const SORTED_EVENTS = [
  { id: 'e1', title: '여름맞이 룰렛대전', endAt: '2026-08-15T00:00:00.000Z', status: 'ONGOING', isPinned: true },
  { id: 'e2', title: '신규 거래처 감사', endAt: '2026-08-18T00:00:00.000Z', status: 'ONGOING', isPinned: false },
  { id: 'e3', title: '봄맞이 사은품 증정', endAt: '2026-08-23T00:00:00.000Z', status: 'ONGOING', isPinned: false },
  { id: 'e4', title: '작년 연말 이벤트', endAt: '2025-12-31T00:00:00.000Z', status: 'CLOSED', isPinned: false },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EventListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EventListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  it('백엔드가 정렬해 내려준 순서 그대로 렌더링한다(상단노출→마감임박순→동률시 등록순은 서버 책임)', async () => {
    eventsApi.list.mockResolvedValue(SORTED_EVENTS);
    renderPage();

    const titles = await screen.findAllByText(/여름맞이 룰렛대전|신규 거래처 감사|봄맞이 사은품 증정|작년 연말 이벤트/);
    expect(titles.map((el) => el.textContent)).toEqual([
      '여름맞이 룰렛대전',
      '신규 거래처 감사',
      '봄맞이 사은품 증정',
      '작년 연말 이벤트',
    ]);
  });

  it('상단노출 이벤트에 ★ 표시가 붙는다', async () => {
    eventsApi.list.mockResolvedValue(SORTED_EVENTS);
    renderPage();
    expect(await screen.findByText('★ 상단노출')).toBeInTheDocument();
  });

  it('마감이 지난 이벤트에 종료 뱃지가 표시된다(S-10)', async () => {
    eventsApi.list.mockResolvedValue(SORTED_EVENTS);
    renderPage();
    await screen.findByText('작년 연말 이벤트');
    const closedCard = screen.getByText('작년 연말 이벤트').closest('a');
    expect(closedCard).toHaveTextContent('종료');
  });

  it('진행중 이벤트에는 진행중 뱃지가 표시된다', async () => {
    eventsApi.list.mockResolvedValue(SORTED_EVENTS);
    renderPage();
    await screen.findByText('여름맞이 룰렛대전');
    const ongoingCard = screen.getByText('여름맞이 룰렛대전').closest('a');
    expect(ongoingCard).toHaveTextContent('진행중');
  });

  it('비로그인 상태면 로그인 링크를, 로그인 상태면 사용자명을 보여준다', async () => {
    eventsApi.list.mockResolvedValue([]);
    const { unmount } = renderPage();
    expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument();
    unmount();

    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김담당' } });
    renderPage();
    expect(await screen.findByRole('link', { name: '김담당' })).toBeInTheDocument();
  });
});
