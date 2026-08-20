import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/eventsApi.js';
import { entriesApi } from '../../api/entriesApi.js';
import { useAuthStore } from '../../store/authStore.js';
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from '../../constants/statusLabels.js';
import { EVENT_STATUS, PARTICIPATION_TYPE, TARGET_TYPE } from '../../constants/domain.js';
import Badge from '../../components/Badge.jsx';
import ConsentCheckbox from '../../components/ConsentCheckbox.jsx';
import FormFieldsInput from '../../components/FormFieldsInput.jsx';
import { formatDateTime } from '../../lib/format.js';
import '../../styles/button.css';
import './EventDetailPage.css';

function isTargetTypeMismatch(targetType, isLoggedIn) {
  if (targetType === TARGET_TYPE.MEMBER_ONLY && !isLoggedIn) return true;
  if (targetType === TARGET_TYPE.GUEST_ONLY && isLoggedIn) return true;
  return false;
}

export default function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = Boolean(useAuthStore((state) => state.accessToken));

  const eventQuery = useQuery({ queryKey: ['events', eventId], queryFn: () => eventsApi.get(eventId) });
  const event = eventQuery.data;

  const [consent, setConsent] = useState(false);
  const [guestForm, setGuestForm] = useState({ companyName: '', name: '', email: '', phone: '' });
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const entryMutation = useMutation({
    mutationFn: (payload) => entriesApi.create(eventId, payload),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'entries'] });
      if (event.participationType === PARTICIPATION_TYPE.ROULETTE) {
        navigate(`/events/${eventId}/result`, { state: { entry, eventTitle: event.title } });
      } else {
        setSubmitted(true);
      }
    },
  });

  if (!event) return null;

  const isFormType = event.participationType === PARTICIPATION_TYPE.FORM;
  const formFieldsComplete = !isFormType || event.formFields.every((field) => Boolean(formData[field]));

  function updateFormDataField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleMemberSubmit(submitEvent) {
    submitEvent.preventDefault();
    entryMutation.mutate({ consent: true, ...(isFormType && { formData }) });
  }

  function handleGuestSubmit(submitEvent) {
    submitEvent.preventDefault();
    entryMutation.mutate({
      consent: true,
      guestEmail: guestForm.email,
      guestPhone: guestForm.phone,
      guestInfo: { companyName: guestForm.companyName, name: guestForm.name, phone: guestForm.phone },
      ...(isFormType && { formData }),
    });
  }

  function updateGuestField(field, value) {
    setGuestForm((prev) => ({ ...prev, [field]: value }));
  }

  const mismatch = isTargetTypeMismatch(event.targetType, isLoggedIn);
  const isOngoing = event.status === EVENT_STATUS.ONGOING;
  const guestFormComplete =
    Boolean(guestForm.companyName) && Boolean(guestForm.name) && Boolean(guestForm.email) && Boolean(guestForm.phone);

  return (
    <div className="event-detail-page">
      <header className="event-detail-page__header">
        <Link to="/">← 목록으로</Link>
        <Badge tone={EVENT_STATUS_TONE[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Badge>
      </header>

      <div className="event-detail-page__body">
        <section className="event-detail-page__info">
          <h1>{event.title}</h1>
          {event.description && <p>{event.description}</p>}
          <p>마감: {formatDateTime(event.endAt)}</p>
        </section>

        <section className="event-detail-page__action">
        {!isOngoing && (
          <p className="event-detail-page__notice">
            {event.status === EVENT_STATUS.CLOSED ? '종료된 이벤트입니다.' : '아직 시작되지 않은 이벤트입니다.'}
          </p>
        )}

        {isOngoing && mismatch && event.targetType === TARGET_TYPE.MEMBER_ONLY && (
          <div>
            <p className="event-detail-page__notice">
              이 이벤트는 회원 전용입니다.
              <br />
              로그인 후 참여해 주세요.
            </p>
            <div className="event-detail-page__actions">
              <Link to="/login" className="button button--primary">
                로그인
              </Link>
              <Link to="/signup" className="button button--secondary">
                회원가입
              </Link>
            </div>
          </div>
        )}

        {isOngoing && mismatch && event.targetType === TARGET_TYPE.GUEST_ONLY && (
          <p className="event-detail-page__notice">
            이 이벤트는 비회원 전용입니다.
            <br />
            회원은 참여할 수 없습니다.
          </p>
        )}

        {isOngoing && !mismatch && submitted && <p className="event-detail-page__notice">참여가 완료되었습니다.</p>}

        {isOngoing && !mismatch && !submitted && isLoggedIn && (
          <form onSubmit={handleMemberSubmit}>
            <p>
              로그인 회원: {user.name} ({user.companyName})
            </p>
            {isFormType && <FormFieldsInput fields={event.formFields} values={formData} onChange={updateFormDataField} />}
            <ConsentCheckbox variant="member" checked={consent} onChange={setConsent} />
            <button
              type="submit"
              className="button button--primary"
              disabled={!consent || !formFieldsComplete || entryMutation.isPending}
            >
              참여하기
            </button>
          </form>
        )}

        {isOngoing && !mismatch && !submitted && !isLoggedIn && (
          <form onSubmit={handleGuestSubmit}>
            <label>
              업체명
              <input
                value={guestForm.companyName}
                onChange={(event) => updateGuestField('companyName', event.target.value)}
                required
              />
            </label>
            <label>
              담당자명
              <input value={guestForm.name} onChange={(event) => updateGuestField('name', event.target.value)} required />
            </label>
            <label>
              이메일
              <input
                type="email"
                value={guestForm.email}
                onChange={(event) => updateGuestField('email', event.target.value)}
                required
              />
            </label>
            <label>
              연락처
              <input value={guestForm.phone} onChange={(event) => updateGuestField('phone', event.target.value)} required />
            </label>
            {isFormType && <FormFieldsInput fields={event.formFields} values={formData} onChange={updateFormDataField} />}
            <ConsentCheckbox variant="guest" checked={consent} onChange={setConsent} />
            <button
              type="submit"
              className="button button--primary"
              disabled={!consent || !guestFormComplete || !formFieldsComplete || entryMutation.isPending}
            >
              참여하기
            </button>
          </form>
        )}
        </section>
      </div>
    </div>
  );
}
