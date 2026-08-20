import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import EventDetailPage from './EventDetailPage.jsx';
import { eventsApi } from '../../api/eventsApi.js';
import { entriesApi } from '../../api/entriesApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { queryClient } from '../../lib/queryClient.js';

vi.mock('../../api/eventsApi.js', () => ({ eventsApi: { get: vi.fn() } }));
vi.mock('../../api/entriesApi.js', () => ({ entriesApi: { create: vi.fn() } }));

const BASE_EVENT = {
  id: 'e1',
  title: '여름맞이 룰렛대전',
  description: '설명입니다',
  endAt: '2026-08-15T23:59:00.000Z',
  status: 'ONGOING',
  targetType: 'COMMON',
  participationType: 'SIMPLE',
};

function renderPage(eventOverrides = {}) {
  eventsApi.get.mockResolvedValue({ ...BASE_EVENT, ...eventOverrides });
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/events/e1']}>
        <Routes>
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/events/:eventId/result" element={<div>룰렛 결과 화면</div>} />
          <Route path="/login" element={<div>로그인 화면</div>} />
          <Route path="/signup" element={<div>회원가입 화면</div>} />
          <Route path="/" element={<div>이벤트 목록 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
    useToastStore.getState().hideToast();
  });

  it('정보/참여 영역이 하나의 body 래퍼로 묶여 데스크톱 2단 그리드 대상이 된다', async () => {
    const { container } = renderPage();
    await screen.findByText('여름맞이 룰렛대전');
    const body = container.querySelector('.event-detail-page__body');
    expect(body).toBeInTheDocument();
    expect(body.querySelector('.event-detail-page__info')).toBeInTheDocument();
    expect(body.querySelector('.event-detail-page__action')).toBeInTheDocument();
  });

  it('종료된 이벤트는 참여 폼 없이 안내만 표시한다(참여가 시작되지 않는다)', async () => {
    renderPage({ status: 'CLOSED' });
    expect(await screen.findByText('종료된 이벤트입니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '참여하기' })).not.toBeInTheDocument();
  });

  it('아직 시작되지 않은(SCHEDULED) 이벤트도 참여 폼을 보여주지 않는다', async () => {
    renderPage({ status: 'SCHEDULED' });
    expect(await screen.findByText('아직 시작되지 않은 이벤트입니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '참여하기' })).not.toBeInTheDocument();
  });

  it('① 회원 전용/공통 이벤트 + 로그인 상태 → 회원 참여 폼(개인정보 입력 없음)', async () => {
    useAuthStore.getState().setAuth({
      accessToken: 'a',
      refreshToken: 'r',
      user: { name: '김담당', companyName: 'OO식자재' },
    });
    renderPage({ targetType: 'MEMBER_ONLY' });

    expect(await screen.findByText('로그인 회원: 김담당 (OO식자재)')).toBeInTheDocument();
    expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('업체명')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '참여하기' })).toBeDisabled();
  });

  it('동의 체크 전에는 참여 버튼이 비활성이고, 체크하면 활성화된다(S-2)', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김', companyName: 'C' } });
    renderPage();
    await screen.findByRole('button', { name: '참여하기' });

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: '참여하기' })).not.toBeDisabled();
  });

  it('② 비회원 전용/공통 이벤트 + 비로그인 → 비회원 입력 폼', async () => {
    renderPage({ targetType: 'GUEST_ONLY' });
    expect(await screen.findByLabelText('업체명')).toBeInTheDocument();
    expect(screen.getByLabelText('담당자명')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('연락처')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '참여하기' })).toBeDisabled();
  });

  it('비회원 폼은 필수 항목을 모두 채우고 동의해야 참여 버튼이 활성화된다', async () => {
    renderPage({ targetType: 'GUEST_ONLY' });
    await screen.findByLabelText('업체명');

    fireEvent.change(screen.getByLabelText('업체명'), { target: { value: 'OO식자재' } });
    fireEvent.change(screen.getByLabelText('담당자명'), { target: { value: '김담당' } });
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'kim@corp.co.kr' } });
    expect(screen.getByRole('button', { name: '참여하기' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-1234-5678' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: '참여하기' })).not.toBeDisabled();
  });

  it('비회원 폼 제출 시 guestEmail/guestPhone/guestInfo를 담아 참여신청을 생성한다', async () => {
    entriesApi.create.mockResolvedValue({ status: 'APPLIED' });
    renderPage({ targetType: 'GUEST_ONLY' });
    await screen.findByLabelText('업체명');

    fireEvent.change(screen.getByLabelText('업체명'), { target: { value: 'OO식자재' } });
    fireEvent.change(screen.getByLabelText('담당자명'), { target: { value: '김담당' } });
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'kim@corp.co.kr' } });
    fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-1234-5678' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }));

    await waitFor(() =>
      expect(entriesApi.create).toHaveBeenCalledWith('e1', {
        consent: true,
        guestEmail: 'kim@corp.co.kr',
        guestPhone: '010-1234-5678',
        guestInfo: { companyName: 'OO식자재', name: '김담당', phone: '010-1234-5678' },
      }),
    );
    expect(await screen.findByText('참여가 완료되었습니다.')).toBeInTheDocument();
  });

  it('③-1 회원 전용 이벤트 + 비로그인 → 로그인 유도 안내와 버튼이 뜬다', async () => {
    renderPage({ targetType: 'MEMBER_ONLY' });
    expect(await screen.findByText(/이 이벤트는 회원 전용입니다/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '회원가입' })).toBeInTheDocument();
  });

  it('③-2 비회원 전용 이벤트 + 로그인 회원 → 안내만 뜨고 로그인 버튼은 없다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김', companyName: 'C' } });
    renderPage({ targetType: 'GUEST_ONLY' });
    expect(await screen.findByText(/이 이벤트는 비회원 전용입니다/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
  });

  it('룰렛 이벤트 참여 성공 시 결과 화면으로 이동한다', async () => {
    entriesApi.create.mockResolvedValue({ status: 'WON', prize: { name: '상품권' } });
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김', companyName: 'C' } });
    renderPage({ participationType: 'ROULETTE' });

    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }));

    expect(await screen.findByText('룰렛 결과 화면')).toBeInTheDocument();
  });

  it('단순 참여 이벤트 성공 시 결과 화면 대신 완료 문구를 인라인으로 보여준다', async () => {
    entriesApi.create.mockResolvedValue({ status: 'APPLIED' });
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김', companyName: 'C' } });
    renderPage({ participationType: 'SIMPLE' });

    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }));

    expect(await screen.findByText('참여가 완료되었습니다.')).toBeInTheDocument();
    expect(screen.queryByText('룰렛 결과 화면')).not.toBeInTheDocument();
  });

  it('폼 제출형 이벤트는 정의된 필드 입력칸을 보여주고, 채우지 않으면 제출이 막힌다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김', companyName: 'C' } });
    renderPage({ participationType: 'FORM', formFields: ['회사명', '요청사항'] });

    expect(await screen.findByLabelText('회사명')).toBeInTheDocument();
    expect(screen.getByLabelText('요청사항')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: '참여하기' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('회사명'), { target: { value: 'OO식자재' } });
    expect(screen.getByRole('button', { name: '참여하기' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('요청사항'), { target: { value: '빠른 배송 부탁드립니다' } });
    expect(screen.getByRole('button', { name: '참여하기' })).not.toBeDisabled();
  });

  it('폼 제출형 참여 제출 시 formData가 함께 전송된다(회원)', async () => {
    entriesApi.create.mockResolvedValue({ status: 'APPLIED' });
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김', companyName: 'C' } });
    renderPage({ participationType: 'FORM', formFields: ['요청사항'] });

    fireEvent.change(await screen.findByLabelText('요청사항'), { target: { value: '빠른 배송 부탁드립니다' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }));

    await waitFor(() =>
      expect(entriesApi.create).toHaveBeenCalledWith('e1', {
        consent: true,
        formData: { 요청사항: '빠른 배송 부탁드립니다' },
      }),
    );
  });

  it('단순 참여/룰렛 게임형 이벤트 상세에는 FormFieldsInput이 나타나지 않는다', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김', companyName: 'C' } });
    const { unmount } = renderPage({ participationType: 'SIMPLE' });
    await screen.findByRole('button', { name: '참여하기' });
    expect(screen.queryByLabelText('요청사항')).not.toBeInTheDocument();
    unmount();

    renderPage({ participationType: 'ROULETTE' });
    await screen.findByRole('button', { name: '참여하기' });
    expect(screen.queryByLabelText('요청사항')).not.toBeInTheDocument();
  });

  it('중복 참여 시 Toast로 "이미 참여하셨습니다" 메시지가 표시된다(S-4)', async () => {
    entriesApi.create.mockRejectedValue(
      Object.assign(new Error('이미 참여하셨습니다.'), { code: 'DUPLICATE_ENTRY', status: 409 }),
    );
    useAuthStore.getState().setAuth({ accessToken: 'a', refreshToken: 'r', user: { name: '김', companyName: 'C' } });
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '참여하기' }));

    await waitFor(() => expect(useToastStore.getState().toast?.message).toBe('이미 참여하셨습니다.'));
  });
});
