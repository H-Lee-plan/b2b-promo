import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/eventsApi.js';
import { entriesApi } from '../../api/entriesApi.js';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from '../../constants/statusLabels.js';
import Badge from '../../components/Badge.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import '../../styles/button.css';
import './AdminEventListPage.css';

function ParticipantCount({ eventId }) {
  const { data } = useQuery({
    queryKey: ['events', eventId, 'entries'],
    queryFn: () => entriesApi.list(eventId),
  });
  return data ? data.length : '-';
}

export default function AdminEventListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [closingEvent, setClosingEvent] = useState(null);

  const eventsQuery = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });

  const closeMutation = useMutation({
    mutationFn: (eventId) => eventsApi.close(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setClosingEvent(null);
    },
  });

  function handleLogout() {
    authApi.logout(refreshToken).finally(() => {
      clearAuth();
      navigate('/admin/login', { replace: true });
    });
  }

  const events = eventsQuery.data ?? [];

  return (
    <div className="admin-event-list">
      <header className="admin-event-list__header">
        <h1>온리원이벤트 관리자</h1>
        <button type="button" className="button button--secondary" onClick={handleLogout}>
          로그아웃
        </button>
      </header>

      <div className="admin-event-list__toolbar">
        <button type="button" className="button button--primary" onClick={() => navigate('/admin/events/new')}>
          + 이벤트 등록
        </button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>이벤트명</th>
            <th>상태</th>
            <th>참여자수</th>
            <th>상단노출</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} onClick={() => navigate(`/admin/events/${event.id}/entries`)}>
              <td>{event.title}</td>
              <td>
                <Badge tone={EVENT_STATUS_TONE[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Badge>
              </td>
              <td>
                <ParticipantCount eventId={event.id} />
              </td>
              <td>{event.isPinned ? '★' : ''}</td>
              <td onClick={(clickEvent) => clickEvent.stopPropagation()}>
                <button type="button" onClick={() => navigate(`/admin/events/${event.id}/edit`)}>
                  수정
                </button>
                {event.status !== 'CLOSED' && (
                  <button
                    type="button"
                    className="button button--danger"
                    onClick={() => setClosingEvent(event)}
                  >
                    종료
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={Boolean(closingEvent)}
        title={`"${closingEvent?.title ?? ''}" 이벤트를 종료할까요?`}
        message="종료 후에는 되돌릴 수 없고, 신규 참여신청을 받지 않습니다."
        confirmLabel="종료"
        onCancel={() => setClosingEvent(null)}
        onConfirm={() => closeMutation.mutate(closingEvent.id)}
      />
    </div>
  );
}
