import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RouletteResultPage from './RouletteResultPage.jsx';

function renderWithEntry(entry, eventTitle = '여름맞이 룰렛대전') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/events/e1/result', state: { entry, eventTitle } }]}>
      <Routes>
        <Route path="/events/:eventId/result" element={<RouletteResultPage />} />
        <Route path="/" element={<div>이벤트 목록 화면</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RouletteResultPage', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('참여 직후 결과 화면에 경품명이 표시된다(당첨)', async () => {
    renderWithEntry({ status: 'WON', prize: { name: '커피쿠폰' } });
    expect(await screen.findByText('축하합니다! "커피쿠폰" 당첨', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('미당첨 결과가 에러가 아니라 정상 결과 문구로 표시된다', async () => {
    renderWithEntry({ status: 'LOST', prize: null });
    expect(await screen.findByText('아쉽게도 미당첨입니다', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('캡처 안내 문구가 노출된다', async () => {
    renderWithEntry({ status: 'WON', prize: { name: '상품권' } });
    expect(await screen.findByText(/이 화면을 캡처해 두세요/, {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('재시도/다시 돌리기 버튼이 화면에 존재하지 않는다(S-5)', async () => {
    renderWithEntry({ status: 'WON', prize: { name: '상품권' } });
    await screen.findByText(/당첨/, {}, { timeout: 2000 });
    expect(screen.queryByRole('button', { name: /다시|재시도|재추첨/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '목록으로 돌아가기' })).toBeInTheDocument();
  });

  it('결과는 애니메이션 지연이 끝난 뒤에도 route state로 전달된 서버 확정값 그대로다(애니메이션이 결과를 정하지 않음)', async () => {
    renderWithEntry({ status: 'LOST', prize: null });
    // 애니메이션 표시 중에는 결과 텍스트가 없다가, 지연 후 서버가 준 값(LOST)만 그대로 나타난다
    expect(screen.queryByText('아쉽게도 미당첨입니다')).not.toBeInTheDocument();
    expect(await screen.findByText('아쉽게도 미당첨입니다', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('route state에 entry가 없으면(직접 접근/새로고침) 안내 문구를 보여준다', () => {
    render(
      <MemoryRouter initialEntries={['/events/e1/result']}>
        <Routes>
          <Route path="/events/:eventId/result" element={<RouletteResultPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/결과를 표시할 수 없습니다/)).toBeInTheDocument();
  });

  it('prefers-reduced-motion이 설정되면 스피너 애니메이션 없이 즉시 결과를 표시한다', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    renderWithEntry({ status: 'WON', prize: { name: '상품권' } });

    expect(await screen.findByText('축하합니다! "상품권" 당첨')).toBeInTheDocument();
    expect(document.querySelector('.roulette-result-page__spinner--spinning')).not.toBeInTheDocument();
  });
});
