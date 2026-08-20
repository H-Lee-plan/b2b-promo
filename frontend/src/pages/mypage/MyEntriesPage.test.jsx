import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import MyEntriesPage from './MyEntriesPage.jsx';
import RequireAuth from '../../components/RequireAuth.jsx';
import { authApi } from '../../api/authApi.js';
import { mypageApi } from '../../api/mypageApi.js';
import { eventsApi } from '../../api/eventsApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { queryClient } from '../../lib/queryClient.js';

vi.mock('../../api/authApi.js', () => ({ authApi: { logout: vi.fn() } }));
vi.mock('../../api/mypageApi.js', () => ({
  mypageApi: { getEntries: vi.fn(), cancelEntry: vi.fn() },
}));
vi.mock('../../api/eventsApi.js', () => ({ eventsApi: { get: vi.fn() } }));

function renderPage() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/mypage']}>
        <Routes>
          <Route path="/login" element={<div>로그인 화면</div>} />
          <Route path="/mypage/profile" element={<div>내 정보 화면</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/mypage" element={<MyEntriesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MyEntriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.logout.mockResolvedValue(null);
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { role: 'MEMBER' } });
  });

  it('본인 참여 내역과 당첨 결과를 조회한다', async () => {
    mypageApi.getEntries.mockResolvedValue([
      { id: 'entry1', eventId: 'e1', status: 'WON', prize: { name: '커피쿠폰' } },
    ]);
    eventsApi.get.mockResolvedValue({ id: 'e1', title: '여름맞이 룰렛대전', participationType: 'ROULETTE' });

    renderPage();

    expect(await screen.findByText('여름맞이 룰렛대전')).toBeInTheDocument();
    expect(screen.getByText('당첨')).toBeInTheDocument();
    expect(screen.getByText('커피쿠폰')).toBeInTheDocument();
  });

  it('참여 내역이 없으면 빈 상태 문구를 보여준다', async () => {
    mypageApi.getEntries.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('참여 내역이 없습니다')).toBeInTheDocument();
  });

  it('룰렛 게임형 신청 건에는 취소 버튼이 아예 보이지 않는다(S-7)', async () => {
    mypageApi.getEntries.mockResolvedValue([{ id: 'entry1', eventId: 'e1', status: 'APPLIED', prize: null }]);
    eventsApi.get.mockResolvedValue({ id: 'e1', title: '룰렛 이벤트', participationType: 'ROULETTE' });

    renderPage();
    await screen.findByText('룰렛 이벤트');
    expect(screen.queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
  });

  it('진행중인 단순 참여형 신청에는 취소 버튼이 보인다', async () => {
    mypageApi.getEntries.mockResolvedValue([{ id: 'entry1', eventId: 'e1', status: 'APPLIED', prize: null }]);
    eventsApi.get.mockResolvedValue({ id: 'e1', title: '단순 참여 이벤트', participationType: 'SIMPLE' });

    renderPage();
    await screen.findByText('단순 참여 이벤트');
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
  });

  it('취소 상태인 신청 건에는 취소 버튼이 보이지 않는다', async () => {
    mypageApi.getEntries.mockResolvedValue([{ id: 'entry1', eventId: 'e1', status: 'CANCELED', prize: null }]);
    eventsApi.get.mockResolvedValue({ id: 'e1', title: '단순 참여 이벤트', participationType: 'SIMPLE' });

    renderPage();
    await screen.findByText('단순 참여 이벤트');
    expect(screen.queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
  });

  it('단순 참여형 신청을 취소하면 목록 상태가 즉시 갱신된다', async () => {
    mypageApi.getEntries
      .mockResolvedValueOnce([{ id: 'entry1', eventId: 'e1', status: 'APPLIED', prize: null }])
      .mockResolvedValueOnce([{ id: 'entry1', eventId: 'e1', status: 'CANCELED', prize: null }]);
    eventsApi.get.mockResolvedValue({ id: 'e1', title: '단순 참여 이벤트', participationType: 'SIMPLE' });
    mypageApi.cancelEntry.mockResolvedValue({ id: 'entry1', status: 'CANCELED' });

    renderPage();
    await screen.findByRole('button', { name: '취소' });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() => expect(mypageApi.cancelEntry).toHaveBeenCalledWith('entry1'));
    await waitFor(() => expect(mypageApi.getEntries).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('취소')).toBeInTheDocument());
  });

  it('내 정보 링크 클릭 시 프로필 화면으로 이동한다', async () => {
    mypageApi.getEntries.mockResolvedValue([]);
    renderPage();
    await screen.findByText('참여 내역이 없습니다');
    fireEvent.click(screen.getByRole('link', { name: '내 정보' }));
    expect(await screen.findByText('내 정보 화면')).toBeInTheDocument();
  });

  it('로그아웃 클릭 시 토큰이 지워지고 로그인 화면으로 이동해 이후 /mypage 접근이 차단된다', async () => {
    mypageApi.getEntries.mockResolvedValue([]);
    renderPage();
    await screen.findByText('참여 내역이 없습니다');
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(authApi.logout).toHaveBeenCalledWith('r'));
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();

    const { unmount } = renderPage();
    expect(screen.getAllByText('로그인 화면').length).toBeGreaterThan(0);
    unmount();
  });
});
