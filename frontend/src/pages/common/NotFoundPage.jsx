import { Link } from 'react-router-dom';
import '../../styles/button.css';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>주소를 다시 확인해 주세요.</p>
      <Link to="/" className="button button--primary">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
