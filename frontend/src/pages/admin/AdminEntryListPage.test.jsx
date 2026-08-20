import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminEntryListPage from './AdminEntryListPage.jsx';
import { entriesApi } from '../../api/entriesApi.js';
import { eventsApi } from '../../api/eventsApi.js';
import { downloadBlob } from '../../lib/exportCsv.js';

vi.mock('../../api/entriesApi.js', () => ({
  entriesApi: { list: vi.fn(), updateConsentNote: vi.fn(), exportCsv: vi.fn() },
}));
vi.mock('../../api/eventsApi.js', () => ({ eventsApi: { get: vi.fn() } }));
vi.mock('../../lib/exportCsv.js', () => ({ downloadBlob: vi.fn() }));

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

  it('폼 제출형 참여신청의 제출 내용(formData)이 표시된다(FE-12)', async () => {
    entriesApi.list.mockResolvedValue([
      {
        id: 'entry3',
        user: { companyName: 'OO식자재', name: '박담당', email: 'park@corp.co.kr' },
        guestEmail: null,
        guestInfo: null,
        consentedAt: '2026-08-13T10:07:00.000Z',
        formData: { 회사명: 'OO식자재', 요청사항: '빠른 배송 부탁드려요' },
        prize: null,
        status: 'APPLIED',
      },
    ]);

    renderPage();
    const row = (await screen.findAllByRole('row')).find((r) => r.textContent.includes('박담당'));
    expect(row).toHaveTextContent('회사명: OO식자재');
    expect(row).toHaveTextContent('요청사항: 빠른 배송 부탁드려요');
  });

  it('참여신청 0건이면 에러 대신 빈 상태 문구를 보여준다', async () => {
    entriesApi.list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('참여신청이 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('CSV 다운로드 버튼 클릭 시 파일이 내려받아진다', async () => {
    entriesApi.list.mockResolvedValue([]);
    const csvBlob = new Blob(['col1,col2'], { type: 'text/csv' });
    entriesApi.exportCsv.mockResolvedValue(csvBlob);
    renderPage();
    await screen.findByText('참여신청이 없습니다');

    fireEvent.click(screen.getByRole('button', { name: 'CSV 다운로드' }));

    await waitFor(() => expect(entriesApi.exportCsv).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(csvBlob, 'entries-e1.csv'));
  });

  it('관리자가 참여신청 건에 동의 보유 내용 메모를 작성·수정할 수 있다', async () => {
    entriesApi.list.mockResolvedValue([
      {
        id: 'entry1',
        user: { companyName: 'OO식자재', name: '김담당', email: 'kim@corp.co.kr' },
        guestEmail: null,
        guestInfo: null,
        consentedAt: '2026-08-13T10:02:00.000Z',
        consentNote: null,
        prize: null,
        status: 'APPLIED',
      },
    ]);
    entriesApi.updateConsentNote.mockResolvedValue({ id: 'entry1', consentNote: '전화로 재확인함' });

    renderPage();
    await screen.findByText('김담당');

    fireEvent.click(screen.getByRole('button', { name: '편집' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '전화로 재확인함' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(entriesApi.updateConsentNote).toHaveBeenCalledWith('e1', 'entry1', {
        consentNote: '전화로 재확인함',
      }),
    );
  });

  it('메모 편집 중 취소를 누르면 저장하지 않고 편집 모드를 벗어난다', async () => {
    entriesApi.list.mockResolvedValue([
      {
        id: 'entry1',
        user: { companyName: 'OO식자재', name: '김담당', email: 'kim@corp.co.kr' },
        guestEmail: null,
        guestInfo: null,
        consentedAt: '2026-08-13T10:02:00.000Z',
        consentNote: '기존 메모',
        prize: null,
        status: 'APPLIED',
      },
    ]);

    renderPage();
    await screen.findByText('기존 메모');

    fireEvent.click(screen.getByRole('button', { name: '편집' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '수정 중인 메모' } });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.getByText('기존 메모')).toBeInTheDocument();
    expect(entriesApi.updateConsentNote).not.toHaveBeenCalled();
  });

  it('저장된 메모는 다시 조회(새로고침)해도 유지된다', async () => {
    entriesApi.list.mockResolvedValue([
      {
        id: 'entry1',
        user: { companyName: 'OO식자재', name: '김담당', email: 'kim@corp.co.kr' },
        guestEmail: null,
        guestInfo: null,
        consentedAt: '2026-08-13T10:02:00.000Z',
        consentNote: '기존 메모',
        prize: null,
        status: 'APPLIED',
      },
    ]);

    renderPage();
    expect(await screen.findByText('기존 메모')).toBeInTheDocument();
    expect(screen.getByText('동의 보유 내용')).toBeInTheDocument();
  });

  it('← 이벤트 목록 클릭 시 이벤트 목록 화면으로 이동한다', async () => {
    entriesApi.list.mockResolvedValue([]);
    renderPage();
    await screen.findByText('참여신청이 없습니다');
    fireEvent.click(screen.getByRole('button', { name: '← 이벤트 목록' }));
    expect(await screen.findByText('관리자 이벤트 목록')).toBeInTheDocument();
  });
});
