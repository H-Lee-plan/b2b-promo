import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/eventsApi.js';
import { TARGET_TYPE, PARTICIPATION_TYPE, EVENT_STATUS } from '../../constants/domain.js';
import { TARGET_TYPE_LABEL, PARTICIPATION_TYPE_LABEL } from '../../constants/statusLabels.js';
import '../../styles/button.css';
import './AdminEventFormPage.css';

const FORM_PARTICIPATION_TYPES = [PARTICIPATION_TYPE.SIMPLE, PARTICIPATION_TYPE.FORM, PARTICIPATION_TYPE.ROULETTE];

function toDatetimeLocal(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyPrize() {
  return { name: '', weight: 1 };
}

function validateWeight(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return 'weight는 1 이상의 정수여야 합니다.';
  return null;
}

export default function AdminEventFormPage() {
  const { eventId } = useParams();
  const isEdit = Boolean(eventId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    targetType: TARGET_TYPE.COMMON,
    participationType: PARTICIPATION_TYPE.SIMPLE,
    startAt: '',
    endAt: '',
    isPinned: false,
  });
  const [prizes, setPrizes] = useState([]);
  const [prizeErrors, setPrizeErrors] = useState({});
  const [formFields, setFormFields] = useState(['']);
  const [formFieldError, setFormFieldError] = useState(null);

  useEffect(() => {
    const event = eventQuery.data;
    if (!event) return;
    setForm({
      title: event.title,
      description: event.description ?? '',
      targetType: event.targetType,
      participationType: event.participationType,
      startAt: toDatetimeLocal(event.startAt),
      endAt: toDatetimeLocal(event.endAt),
      isPinned: event.isPinned,
    });
    setPrizes(event.prizes?.length ? event.prizes.map(({ name, weight }) => ({ name, weight })) : []);
    setFormFields(event.formFields?.length ? event.formFields : ['']);
  }, [eventQuery.data]);

  const isOngoing = eventQuery.data?.status === EVENT_STATUS.ONGOING;
  const isRoulette = form.participationType === PARTICIPATION_TYPE.ROULETTE;
  const isForm = form.participationType === PARTICIPATION_TYPE.FORM;

  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? eventsApi.update(eventId, payload) : eventsApi.create(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/admin/events');
    },
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updatePrize(index, field, value) {
    setPrizes((prev) => prev.map((prize, i) => (i === index ? { ...prize, [field]: value } : prize)));
    if (field === 'weight') {
      setPrizeErrors((prev) => ({ ...prev, [index]: validateWeight(value) }));
    }
  }

  function addPrize() {
    setPrizes((prev) => [...prev, emptyPrize()]);
  }

  function removePrize(index) {
    setPrizes((prev) => prev.filter((_, i) => i !== index));
    setPrizeErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function updateFormField(index, value) {
    setFormFields((prev) => prev.map((field, i) => (i === index ? value : field)));
  }

  function addFormField() {
    setFormFields((prev) => [...prev, '']);
  }

  function removeFormField(index) {
    setFormFields((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isRoulette) {
      const errors = {};
      prizes.forEach((prize, i) => {
        const error = validateWeight(prize.weight);
        if (error) errors[i] = error;
      });
      setPrizeErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }

    if (isForm) {
      const hasEmptyField = formFields.length === 0 || formFields.some((field) => !field.trim());
      setFormFieldError(hasEmptyField ? '필드명을 모두 입력해주세요.' : null);
      if (hasEmptyField) return;
    }

    const payload = {
      title: form.title,
      description: form.description || null,
      targetType: form.targetType,
      participationType: form.participationType,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      isPinned: form.isPinned,
    };

    if (isRoulette) {
      payload.prizes = prizes.map((prize) => ({ name: prize.name, weight: Number(prize.weight) }));
    }

    if (isForm) {
      payload.formFields = formFields.map((field) => field.trim());
    }

    saveMutation.mutate(payload);
  }

  return (
    <form className="admin-event-form" onSubmit={handleSubmit}>
      <h1>이벤트 등록/수정</h1>

      <label>
        이벤트명
        <input value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
      </label>

      <label>
        설명 (선택)
        <input value={form.description} onChange={(event) => updateField('description', event.target.value)} />
      </label>

      <fieldset disabled={isOngoing}>
        <legend>참여 대상 유형</legend>
        {Object.values(TARGET_TYPE).map((type) => (
          <label key={type}>
            <input
              type="radio"
              name="targetType"
              checked={form.targetType === type}
              onChange={() => updateField('targetType', type)}
            />
            {TARGET_TYPE_LABEL[type]}
          </label>
        ))}
      </fieldset>

      <fieldset disabled={isOngoing}>
        <legend>참여 방식</legend>
        {FORM_PARTICIPATION_TYPES.map((type) => (
          <label key={type}>
            <input
              type="radio"
              name="participationType"
              checked={form.participationType === type}
              onChange={() => updateField('participationType', type)}
            />
            {PARTICIPATION_TYPE_LABEL[type]}
          </label>
        ))}
      </fieldset>

      <label>
        시작 일시
        <input
          type="datetime-local"
          value={form.startAt}
          onChange={(event) => updateField('startAt', event.target.value)}
          disabled={isOngoing}
          required
        />
      </label>

      <label>
        마감 일시
        <input
          type="datetime-local"
          value={form.endAt}
          onChange={(event) => updateField('endAt', event.target.value)}
          required
        />
      </label>

      <label className="admin-event-form__toggle">
        상단 노출
        <input
          type="checkbox"
          checked={form.isPinned}
          onChange={(event) => updateField('isPinned', event.target.checked)}
        />
      </label>

      {isRoulette && (
        <fieldset className="admin-event-form__prizes" disabled={isOngoing}>
          <legend>경품 목록 (경품 1건 이상 등록해야 진행중 전환 가능)</legend>
          {prizes.map((prize, index) => (
            <div className="admin-event-form__prize-row" key={index}>
              <input
                placeholder="경품명"
                value={prize.name}
                onChange={(event) => updatePrize(index, 'name', event.target.value)}
                required
              />
              <input
                type="number"
                placeholder="가중치(weight)"
                value={prize.weight}
                onChange={(event) => updatePrize(index, 'weight', event.target.value)}
                required
              />
              <button type="button" onClick={() => removePrize(index)}>
                삭제
              </button>
              {prizeErrors[index] && <p className="field-error">{prizeErrors[index]}</p>}
            </div>
          ))}
          <button type="button" onClick={addPrize}>
            + 경품 추가
          </button>
        </fieldset>
      )}

      {isForm && (
        <fieldset className="admin-event-form__fields" disabled={isOngoing}>
          <legend>참여 폼 필드 (1건 이상 등록)</legend>
          {formFields.map((field, index) => (
            <div className="admin-event-form__field-row" key={index}>
              <input
                placeholder="필드명 (예: 요청사항)"
                value={field}
                onChange={(event) => updateFormField(index, event.target.value)}
                required
              />
              <button type="button" onClick={() => removeFormField(index)}>
                삭제
              </button>
            </div>
          ))}
          {formFieldError && <p className="field-error">{formFieldError}</p>}
          <button type="button" onClick={addFormField}>
            + 필드 추가
          </button>
        </fieldset>
      )}

      <div className="admin-event-form__actions">
        <button type="button" className="button button--secondary" onClick={() => navigate('/admin/events')}>
          취소
        </button>
        <button type="submit" className="button button--primary" disabled={saveMutation.isPending}>
          저장
        </button>
      </div>
    </form>
  );
}
