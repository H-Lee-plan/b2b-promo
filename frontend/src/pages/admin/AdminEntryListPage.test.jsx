import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminEntryListPage from './AdminEntryListPage.jsx';
import { entriesApi } from '../../api/entriesApi.js';
import { eventsApi } from '../../api/eventsApi.js';

vi.mock('../../api/entriesApi.js', () => ({ entriesApi: { list: vi.fn() } }));
vi.mock('../../api/eventsApi.js', () => ({ eventsApi: { get: vi.fn() } }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/events/e1/entries']}>
        <Routes>
          <Route path="/admin/events/:eventId/entries" element={<AdminEntryListPage />} />
          <Route path="/admin/events" element={<div>관리자 이벤트 목록</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminEntryListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventsApi.get.mockResolvedValue({ id: 'e1', title: '여름맞이 룰렛대전' });
  });

  it('회원/비회원 참여 건이 구분되고 동의시각·경품이 표시된다', async () => {
    entriesApi.list.mockResolvedValue([
      {
        id: 'entry1',
        user: { companyName: 'OO식자재', name: '김담당', email: 'kim@corp.co.kr' },
        guestEmail: null,
        guestInfo: null,
        consentedAt: '2026-08-13T10:02:00.000Z',
        prize: { name: '커피쿠폰' },
        status: 'WON',
      },
      {
        id: 'entry2',
        user: null,
        guestEmail: 'lee@corp.co.kr',
        guestInfo: { companyName: '△△유통', name: '이담당' },
        consentedAt: '2026-08-13T10:05:00.000Z',
        prize: null,
        status: 'LOST',
      },
    ]);

    renderPage();

    expect(await screen.findByText(/여름맞이 룰렛대전 — 참여신청 목록 \(2건\)/)).toBeInTheDocument();

    const rows = await screen.findAllByRole('row');
    const memberRow = rows.find((row) => row.textContent.includes('OO식자재'));
    const guestRow = rows.find((row) => row.textContent.includes('△△유통'));

    expect(memberRow).toHaveTextContent('회원');
    expect(memberRow).toHaveTextContent('김담당');
    expect(memberRow).toHaveTextContent('kim@corp.co.kr');
    expect(memberRow).toHaveTextContent('커피쿠폰');
    expect(memberRow).toHaveTextContent('당첨');

    expect(guestRow).toHaveTextContent('비회원');
    expect(guestRow).toHaveTextContent('이담당');
    expect(guestRow).toHaveTextContent('lee@corp.co.kr');
    expect(guestRow).toHaveTextContent('-');
    expect(guestRow).toHaveTextContent('미당첨');
  });

  it('참여신청 0건이면 에러 대신 빈 상태 문구를 보여준다', async () => {
    entriesApi.list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('참여신청이 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('엑셀 다운로드 버튼을 만들지 않았다(FE-14 후행)', async () => {
    entriesApi.list.mockResolvedValue([]);
    renderPage();
    await screen.findByText('참여신청이 없습니다');
    expect(screen.queryByRole('button', { name: /다운로드|엑셀|CSV/i })).not.toBeInTheDocument();
  });

  it('← 이벤트 목록 클릭 시 이벤트 목록 화면으로 이동한다', async () => {
    entriesApi.list.mockResolvedValue([]);
    renderPage();
    await screen.findByText('참여신청이 없습니다');
    fireEvent.click(screen.getByRole('button', { name: '← 이벤트 목록' }));
    expect(await screen.findByText('관리자 이벤트 목록')).toBeInTheDocument();
  });
});
