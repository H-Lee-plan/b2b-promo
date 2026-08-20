import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { entriesApi } from '../../api/entriesApi.js';
import { eventsApi } from '../../api/eventsApi.js';
import { ENTRY_STATUS_LABEL, ENTRY_STATUS_TONE } from '../../constants/statusLabels.js';
import Badge from '../../components/Badge.jsx';
import { formatDateTime } from '../../lib/format.js';
import '../../styles/button.css';
import './AdminEntryListPage.css';

export default function AdminEntryListPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const eventQuery = useQuery({ queryKey: ['events', eventId], queryFn: () => eventsApi.get(eventId) });
  const entriesQuery = useQuery({
    queryKey: ['events', eventId, 'entries'],
    queryFn: () => entriesApi.list(eventId),
  });

  const entries = entriesQuery.data ?? [];
  const event = eventQuery.data;

  return (
    <div className="admin-entry-list">
      <header className="admin-entry-list__header">
        <button type="button" className="button button--secondary" onClick={() => navigate('/admin/events')}>
          ← 이벤트 목록
        </button>
        <h1>
          {event?.title ?? ''} — 참여신청 목록 ({entries.length}건)
        </h1>
      </header>

      {entries.length === 0 ? (
        <p className="admin-entry-list__empty">참여신청이 없습니다</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>업체명</th>
              <th>담당자</th>
              <th>이메일</th>
              <th>동의시각</th>
              <th>경품</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isMember = Boolean(entry.user);
              const companyName = isMember ? entry.user.companyName : entry.guestInfo?.companyName;
              const name = isMember ? entry.user.name : entry.guestInfo?.name;
              const email = isMember ? entry.user.email : entry.guestEmail;
              return (
                <tr key={entry.id}>
                  <td>{isMember ? '회원' : '비회원'}</td>
                  <td>{companyName}</td>
                  <td>{name}</td>
                  <td>{email}</td>
                  <td>{formatDateTime(entry.consentedAt)}</td>
                  <td>{entry.prize?.name ?? '-'}</td>
                  <td>
                    <Badge tone={ENTRY_STATUS_TONE[entry.status]}>{ENTRY_STATUS_LABEL[entry.status]}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
