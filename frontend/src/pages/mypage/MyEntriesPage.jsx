import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mypageApi } from '../../api/mypageApi.js';
import { eventsApi } from '../../api/eventsApi.js';
import { authApi } from '../../api/authApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { ENTRY_STATUS_LABEL, ENTRY_STATUS_TONE } from '../../constants/statusLabels.js';
import { PARTICIPATION_TYPE, ENTRY_STATUS } from '../../constants/domain.js';
import Badge from '../../components/Badge.jsx';
import '../../styles/button.css';
import './MyEntriesPage.css';

function EntryItem({ entry, onCancel, cancelPending }) {
  const eventQuery = useQuery({ queryKey: ['events', entry.eventId], queryFn: () => eventsApi.get(entry.eventId) });
  const event = eventQuery.data;
  const canCancel = entry.status === ENTRY_STATUS.APPLIED && event?.participationType !== PARTICIPATION_TYPE.ROULETTE;

  return (
    <li className="my-entries__item">
      <div className="my-entries__item-info">
        <p className="my-entries__item-title">{event?.title ?? '...'}</p>
        <div className="my-entries__item-meta">
          <Badge tone={ENTRY_STATUS_TONE[entry.status]}>{ENTRY_STATUS_LABEL[entry.status]}</Badge>
          {entry.prize?.name && <span>{entry.prize.name}</span>}
        </div>
      </div>
      {canCancel && (
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onCancel(entry.id)}
          disabled={cancelPending}
        >
          취소
        </button>
      )}
    </li>
  );
}

export default function MyEntriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const entriesQuery = useQuery({ queryKey: ['mypage', 'entries'], queryFn: mypageApi.getEntries });

  const cancelMutation = useMutation({
    mutationFn: (entryId) => mypageApi.cancelEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mypage', 'entries'] });
    },
  });

  function handleLogout() {
    authApi.logout(refreshToken).finally(() => {
      clearAuth();
      navigate('/login', { replace: true });
    });
  }

  const entries = entriesQuery.data ?? [];

  return (
    <div className="my-entries">
      <header className="my-entries__header">
        <h1>마이페이지</h1>
        <div className="my-entries__header-actions">
          <Link to="/mypage/profile">내 정보</Link>
          <button type="button" className="button button--secondary" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="my-entries__empty">참여 내역이 없습니다</p>
      ) : (
        <ul className="my-entries__list">
          {entries.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              onCancel={cancelMutation.mutate}
              cancelPending={cancelMutation.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
