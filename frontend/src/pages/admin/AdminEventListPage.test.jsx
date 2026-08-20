import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminEventListPage from './AdminEventListPage.jsx';
import { eventsApi } from '../../api/eventsApi.js';
import { entriesApi } from '../../api/entriesApi.js';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';

vi.mock('../../api/eventsApi.js', () => ({
  eventsApi: { list: vi.fn(), close: vi.fn() },
}));
vi.mock('../../api/entriesApi.js', () => ({
  entriesApi: { list: vi.fn() },
}));
vi.mock('../../api/authApi.js', () => ({
  authApi: { logout: vi.fn() },
}));

const EVENTS = [
  { id: 'e1', title: '여름맞이 룰렛대전', status: 'ONGOING', isPinned: true },
  { id: 'e2', title: '신규 거래처 감사', status: 'SCHEDULED', isPinned: false },
  { id: 'e3', title: '봄맞이 사은품 증정', status: 'CLOSED', isPinned: false },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/events']}>
        <Routes>
          <Route path="/admin/events" element={<AdminEventListPage />} />
          <Route path="/admin/events/new" element={<div>이벤트 등록 화면</div>} />
          <Route path="/admin/events/:eventId/edit" element={<div>이벤트 수정 화면</div>} />
          <Route path="/admin/events/:eventId/entries" element={<div>참여신청 목록 화면</div>} />
          <Route path="/admin/login" element={<div>관리자 로그인 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminEventListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventsApi.list.mockResolvedValue(EVENTS);
    entriesApi.list.mockResolvedValue([]);
    authApi.logout.mockResolvedValue(null);
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { role: 'ADMIN' } });
  });

  it('이벤트 목록을 조회해 테이블로 보여준다', async () => {
    renderPage();
    expect(await screen.findByText('여름맞이 룰렛대전')).toBeInTheDocument();
    expect(screen.getByText('신규 거래처 감사')).toBeInTheDocument();
    expect(screen.getByText('봄맞이 사은품 증정')).toBeInTheDocument();
  });

  it('진행중/등록 이벤트에는 종료 버튼이, 종료된 이벤트에는 종료 버튼이 없다', async () => {
    renderPage();
    await screen.findByText('여름맞이 룰렛대전');

    const rows = screen.getAllByRole('row');
    const ongoingRow = rows.find((row) => within(row).queryByText('여름맞이 룰렛대전'));
    const scheduledRow = rows.find((row) => within(row).queryByText('신규 거래처 감사'));
    const closedRow = rows.find((row) => within(row).queryByText('봄맞이 사은품 증정'));

    expect(within(ongoingRow).getByRole('button', { name: '종료' })).toBeInTheDocument();
    expect(within(scheduledRow).getByRole('button', { name: '종료' })).toBeInTheDocument();
    expect(within(closedRow).queryByRole('button', { name: '종료' })).not.toBeInTheDocument();
  });

  it('종료 버튼 클릭 → 확인 다이얼로그에서 확인 시 상태 전환 API가 호출되고 목록이 갱신된다', async () => {
    renderPage();
    await screen.findByText('여름맞이 룰렛대전');
    eventsApi.close.mockResolvedValue({ ...EVENTS[0], status: 'CLOSED' });

    const rows = screen.getAllByRole('row');
    const ongoingRow = rows.find((row) => within(row).queryByText('여름맞이 룰렛대전'));
    fireEvent.click(within(ongoingRow).getByRole('button', { name: '종료' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '종료' }));

    await waitFor(() => expect(eventsApi.close).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(eventsApi.list).toHaveBeenCalledTimes(2));
  });

  it('행 클릭 시 참여신청 목록 화면으로 이동하지만, 관리 버튼 클릭은 전파되지 않는다', async () => {
    renderPage();
    await screen.findByText('신규 거래처 감사');

    const rows = screen.getAllByRole('row');
    const scheduledRow = rows.find((row) => within(row).queryByText('신규 거래처 감사'));
    fireEvent.click(within(scheduledRow).getByRole('button', { name: '수정' }));

    expect(screen.queryByText('참여신청 목록 화면')).not.toBeInTheDocument();
    expect(await screen.findByText('이벤트 수정 화면')).toBeInTheDocument();
  });

  it('+ 이벤트 등록 클릭 시 등록 화면으로 이동한다', async () => {
    renderPage();
    await screen.findByText('여름맞이 룰렛대전');
    fireEvent.click(screen.getByRole('button', { name: '+ 이벤트 등록' }));
    expect(await screen.findByText('이벤트 등록 화면')).toBeInTheDocument();
  });

  it('로그아웃 클릭 시 인증 정보를 비우고 관리자 로그인 화면으로 이동한다', async () => {
    renderPage();
    await screen.findByText('여름맞이 룰렛대전');
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(authApi.logout).toHaveBeenCalledWith('r'));
    expect(await screen.findByText('관리자 로그인 화면')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
