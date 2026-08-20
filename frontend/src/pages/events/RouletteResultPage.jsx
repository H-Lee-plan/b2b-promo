import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../../styles/button.css';
import './RouletteResultPage.css';

export default function RouletteResultPage() {
  const location = useLocation();
  const entry = location.state?.entry;
  const eventTitle = location.state?.eventTitle;
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!entry) return undefined;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = prefersReducedMotion ? 0 : 1500;
    const timer = setTimeout(() => setShowResult(true), delay);
    return () => clearTimeout(timer);
  }, [entry]);

  if (!entry) {
    return (
      <div className="roulette-result-page">
        <p>결과를 표시할 수 없습니다. 참여 내역은 마이페이지에서 확인해주세요.</p>
        <Link to="/" className="button button--secondary">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isWon = entry.status === 'WON';

  return (
    <div className="roulette-result-page">
      {eventTitle && <h1>{eventTitle}</h1>}
      <div
        className={`roulette-result-page__spinner${!showResult ? ' roulette-result-page__spinner--spinning' : ''}`}
        aria-hidden="true"
      />
      {showResult && (
        <>
          <p className="roulette-result-page__message">
            {isWon ? `축하합니다! "${entry.prize?.name}" 당첨` : '아쉽게도 미당첨입니다'}
          </p>
          <p className="roulette-result-page__capture-notice">
            ⚠ 이 화면을 캡처해 두세요. (비회원은 다시 조회할 수 없습니다)
          </p>
          <Link to="/" className="button button--primary">
            목록으로 돌아가기
          </Link>
        </>
      )}
    </div>
  );
}
