import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entriesApi } from '../../api/entriesApi.js';
import { eventsApi } from '../../api/eventsApi.js';
import { ENTRY_STATUS_LABEL, ENTRY_STATUS_TONE } from '../../constants/statusLabels.js';
import Badge from '../../components/Badge.jsx';
import { formatDateTime } from '../../lib/format.js';
import { downloadBlob } from '../../lib/exportCsv.js';
import '../../styles/button.css';
import './AdminEntryListPage.css';

function ConsentNoteCell({ eventId, entry }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.consentNote ?? '');

  const mutation = useMutation({
    mutationFn: (consentNote) => entriesApi.updateConsentNote(eventId, entry.id, { consentNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'entries'] });
      setEditing(false);
    },
  });

  function startEditing() {
    setValue(entry.consentNote ?? '');
    setEditing(true);
  }

  if (!editing) {
    return (
      <div className="admin-entry-list__consent-note">
        <span>{entry.consentNote || '-'}</span>
        <button type="button" className="button button--secondary button--small" onClick={startEditing}>
          편집
        </button>
      </div>
    );
  }

  return (
    <div className="admin-entry-list__consent-note">
      <input value={value} onChange={(event) => setValue(event.target.value)} />
      <button
        type="button"
        className="button button--primary button--small"
        onClick={() => mutation.mutate(value)}
        disabled={mutation.isPending}
      >
        저장
      </button>
      <button type="button" className="button button--secondary button--small" onClick={() => setEditing(false)}>
        취소
      </button>
    </div>
  );
}

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

  async function handleDownloadCsv() {
    const blob = await entriesApi.exportCsv(eventId);
    downloadBlob(blob, `entries-${eventId}.csv`);
  }

  return (
    <div className="admin-entry-list">
      <header className="admin-entry-list__header">
        <button type="button" className="button button--secondary" onClick={() => navigate('/admin/events')}>
          ← 이벤트 목록
        </button>
        <h1>
          {event?.title ?? ''} — 참여신청 목록 ({entries.length}건)
        </h1>
        <button type="button" className="button button--secondary" onClick={handleDownloadCsv}>
          CSV 다운로드
        </button>
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
              <th>제출 내용</th>
              <th>동의 보유 내용</th>
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
              const formDataText = entry.formData
                ? Object.entries(entry.formData)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ')
                : '-';
              return (
                <tr key={entry.id}>
                  <td>{isMember ? '회원' : '비회원'}</td>
                  <td>{companyName}</td>
                  <td>{name}</td>
                  <td>{email}</td>
                  <td>{formatDateTime(entry.consentedAt)}</td>
                  <td>{formDataText}</td>
                  <td>
                    <ConsentNoteCell eventId={eventId} entry={entry} />
                  </td>
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
