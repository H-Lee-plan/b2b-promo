import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../../api/eventsApi.js';
import { useAuthStore } from '../../store/authStore.js';
import {
  EVENT_STATUS_LABEL,
  EVENT_STATUS_TONE,
  TARGET_TYPE_LABEL,
  TARGET_TYPE_TONE,
} from '../../constants/statusLabels.js';
import Badge from '../../components/Badge.jsx';
import { formatDday } from '../../lib/format.js';
import './EventListPage.css';

export default function EventListPage() {
  const user = useAuthStore((state) => state.user);
  const eventsQuery = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const events = eventsQuery.data ?? [];

  return (
    <div className="event-list-page">
      <header className="event-list-page__header">
        <h1>온리원이벤트</h1>
        {user ? <Link to="/mypage">{user.name}</Link> : <Link to="/login">로그인</Link>}
      </header>

      <div className="event-list-page__grid">
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className={`event-card${event.isPinned ? ' event-card--pinned' : ''}`}
          >
            <p className="event-card__title">{event.title}</p>
            <div className="event-card__badges">
              <Badge tone={TARGET_TYPE_TONE[event.targetType]}>{TARGET_TYPE_LABEL[event.targetType]}</Badge>
              <Badge tone={EVENT_STATUS_TONE[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Badge>
            </div>
            <div className="event-card__meta">
              <span>{formatDday(event.endAt, event.status)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
