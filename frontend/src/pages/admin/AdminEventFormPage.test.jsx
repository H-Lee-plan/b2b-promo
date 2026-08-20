import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminEventFormPage from './AdminEventFormPage.jsx';
import { eventsApi } from '../../api/eventsApi.js';

vi.mock('../../api/eventsApi.js', () => ({
  eventsApi: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

function renderPage(initialPath) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/admin/events/new" element={<AdminEventFormPage />} />
          <Route path="/admin/events/:eventId/edit" element={<AdminEventFormPage />} />
          <Route path="/admin/events" element={<div>관리자 이벤트 목록</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminEventFormPage — 등록', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('참여 방식을 단순 참여로 두면 경품 입력 영역이 나타나지 않는다', () => {
    renderPage('/admin/events/new');
    expect(screen.queryByText(/경품 목록/)).not.toBeInTheDocument();
  });

  it('참여 방식을 룰렛 게임형으로 선택하면 경품 입력 영역이 나타난다', () => {
    renderPage('/admin/events/new');
    fireEvent.click(screen.getByLabelText('룰렛 게임형'));
    expect(screen.getByText(/경품 목록/)).toBeInTheDocument();
  });

  it('경품 행 추가/삭제가 동작한다', () => {
    renderPage('/admin/events/new');
    fireEvent.click(screen.getByLabelText('룰렛 게임형'));

    fireEvent.click(screen.getByRole('button', { name: '+ 경품 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '+ 경품 추가' }));
    expect(screen.getAllByPlaceholderText('경품명')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0]);
    expect(screen.getAllByPlaceholderText('경품명')).toHaveLength(1);
  });

  it('weight에 0 또는 음수를 입력하면 안내 문구가 뜨고 제출이 막힌다', async () => {
    eventsApi.create.mockResolvedValue({ id: 'new-1' });
    renderPage('/admin/events/new');
    fireEvent.click(screen.getByLabelText('룰렛 게임형'));
    fireEvent.click(screen.getByRole('button', { name: '+ 경품 추가' }));

    fireEvent.change(screen.getByPlaceholderText('경품명'), { target: { value: '상품권' } });
    fireEvent.change(screen.getByPlaceholderText('가중치(weight)'), { target: { value: '0' } });

    expect(await screen.findByText('weight는 1 이상의 정수여야 합니다.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('이벤트명'), { target: { value: '여름 룰렛' } });
    fireEvent.change(screen.getByLabelText('시작 일시'), { target: { value: '2026-09-01T00:00' } });
    fireEvent.change(screen.getByLabelText('마감 일시'), { target: { value: '2026-09-10T00:00' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(eventsApi.create).not.toHaveBeenCalled());
  });

  it('유효한 룰렛 이벤트를 저장하면 prizes를 포함해 eventsApi.create가 호출되고 목록으로 이동한다', async () => {
    eventsApi.create.mockResolvedValue({ id: 'new-1' });
    renderPage('/admin/events/new');

    fireEvent.change(screen.getByLabelText('이벤트명'), { target: { value: '여름 룰렛' } });
    fireEvent.click(screen.getByLabelText('룰렛 게임형'));
    fireEvent.click(screen.getByRole('button', { name: '+ 경품 추가' }));
    fireEvent.change(screen.getByPlaceholderText('경품명'), { target: { value: '상품권' } });
    fireEvent.change(screen.getByPlaceholderText('가중치(weight)'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('시작 일시'), { target: { value: '2026-09-01T00:00' } });
    fireEvent.change(screen.getByLabelText('마감 일시'), { target: { value: '2026-09-10T00:00' } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(eventsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '여름 룰렛',
          participationType: 'ROULETTE',
          prizes: [{ name: '상품권', weight: 5 }],
        }),
      ),
    );
    expect(await screen.findByText('관리자 이벤트 목록')).toBeInTheDocument();
  });

  it('참여 방식을 폼 제출형으로 선택하면 필드 입력 영역이 나타난다', () => {
    renderPage('/admin/events/new');
    fireEvent.click(screen.getByLabelText('폼 제출형'));
    expect(screen.getByText(/참여 폼 필드/)).toBeInTheDocument();
  });

  it('필드 행 추가/삭제가 동작한다', () => {
    renderPage('/admin/events/new');
    fireEvent.click(screen.getByLabelText('폼 제출형'));

    fireEvent.click(screen.getByRole('button', { name: '+ 필드 추가' }));
    expect(screen.getAllByPlaceholderText('필드명 (예: 요청사항)')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0]);
    expect(screen.getAllByPlaceholderText('필드명 (예: 요청사항)')).toHaveLength(1);
  });

  it('필드명이 공백뿐이면 안내 문구가 뜨고 제출이 막힌다', async () => {
    renderPage('/admin/events/new');
    fireEvent.click(screen.getByLabelText('폼 제출형'));
    fireEvent.change(screen.getByPlaceholderText('필드명 (예: 요청사항)'), { target: { value: '   ' } });

    fireEvent.change(screen.getByLabelText('이벤트명'), { target: { value: '폼 이벤트' } });
    fireEvent.change(screen.getByLabelText('시작 일시'), { target: { value: '2026-09-01T00:00' } });
    fireEvent.change(screen.getByLabelText('마감 일시'), { target: { value: '2026-09-10T00:00' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('필드명을 모두 입력해주세요.')).toBeInTheDocument();
    expect(eventsApi.create).not.toHaveBeenCalled();
  });

  it('유효한 폼 제출형 이벤트를 저장하면 formFields를 포함해 eventsApi.create가 호출된다', async () => {
    eventsApi.create.mockResolvedValue({ id: 'new-1' });
    renderPage('/admin/events/new');

    fireEvent.change(screen.getByLabelText('이벤트명'), { target: { value: '폼 이벤트' } });
    fireEvent.click(screen.getByLabelText('폼 제출형'));
    fireEvent.change(screen.getByPlaceholderText('필드명 (예: 요청사항)'), { target: { value: '회사명' } });
    fireEvent.click(screen.getByRole('button', { name: '+ 필드 추가' }));
    fireEvent.change(screen.getAllByPlaceholderText('필드명 (예: 요청사항)')[1], { target: { value: '요청사항' } });
    fireEvent.change(screen.getByLabelText('시작 일시'), { target: { value: '2026-09-01T00:00' } });
    fireEvent.change(screen.getByLabelText('마감 일시'), { target: { value: '2026-09-10T00:00' } });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(eventsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '폼 이벤트',
          participationType: 'FORM',
          formFields: ['회사명', '요청사항'],
        }),
      ),
    );
  });

  it('취소 버튼 클릭 시 저장하지 않고 목록으로 이동한다', async () => {
    renderPage('/admin/events/new');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(await screen.findByText('관리자 이벤트 목록')).toBeInTheDocument();
    expect(eventsApi.create).not.toHaveBeenCalled();
  });
});

describe('AdminEventFormPage — 수정(진행중 이벤트)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventsApi.get.mockResolvedValue({
      id: 'e1',
      title: '여름맞이 룰렛대전',
      description: null,
      targetType: 'COMMON',
      participationType: 'ROULETTE',
      startAt: '2026-08-01T00:00:00.000Z',
      endAt: '2026-08-31T00:00:00.000Z',
      isPinned: true,
      status: 'ONGOING',
      prizes: [{ id: 'p1', name: '상품권', weight: 1 }],
    });
  });

  it('기존 값으로 폼이 채워진다', async () => {
    renderPage('/admin/events/e1/edit');
    expect(await screen.findByDisplayValue('여름맞이 룰렛대전')).toBeInTheDocument();
    expect(screen.getByDisplayValue('상품권')).toBeInTheDocument();
  });

  it('진행중 상태에서는 참여대상유형·참여방식·시작일시 입력칸이 비활성화된다', async () => {
    renderPage('/admin/events/e1/edit');
    await screen.findByDisplayValue('여름맞이 룰렛대전');

    expect(screen.getByLabelText('공통')).toBeDisabled();
    expect(screen.getByLabelText('룰렛 게임형')).toBeDisabled();
    expect(screen.getByLabelText('시작 일시')).toBeDisabled();
    expect(screen.getByLabelText('마감 일시')).not.toBeDisabled();
  });

  it('진행중 상태에서는 경품 목록도 수정할 수 없다', async () => {
    renderPage('/admin/events/e1/edit');
    await screen.findByDisplayValue('상품권');
    expect(screen.getByDisplayValue('상품권')).toBeDisabled();
    expect(screen.getByRole('button', { name: '+ 경품 추가' })).toBeDisabled();
  });

  it('저장 시 eventsApi.update가 eventId와 함께 호출된다', async () => {
    eventsApi.update.mockResolvedValue({});
    renderPage('/admin/events/e1/edit');
    await screen.findByDisplayValue('여름맞이 룰렛대전');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(eventsApi.update).toHaveBeenCalledWith('e1', expect.any(Object)));
  });
});

describe('AdminEventFormPage — 수정(진행중인 폼 제출형 이벤트)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventsApi.get.mockResolvedValue({
      id: 'e2',
      title: '폼 이벤트',
      description: null,
      targetType: 'COMMON',
      participationType: 'FORM',
      startAt: '2026-08-01T00:00:00.000Z',
      endAt: '2026-08-31T00:00:00.000Z',
      isPinned: false,
      status: 'ONGOING',
      formFields: ['회사명', '요청사항'],
    });
  });

  it('기존 formFields로 폼이 채워지고, 진행중 상태에서는 필드를 수정할 수 없다', async () => {
    renderPage('/admin/events/e2/edit');
    expect(await screen.findByDisplayValue('회사명')).toBeInTheDocument();
    expect(screen.getByDisplayValue('요청사항')).toBeInTheDocument();
    expect(screen.getByDisplayValue('회사명')).toBeDisabled();
    expect(screen.getByRole('button', { name: '+ 필드 추가' })).toBeDisabled();
  });
});
