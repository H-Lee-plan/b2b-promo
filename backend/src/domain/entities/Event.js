const { EVENT_STATUS, PARTICIPATION_TYPE } = require('../enums');

class Event {
  constructor({
    id,
    title,
    description,
    targetType,
    participationType,
    startAt,
    endAt,
    isPinned,
    status,
    createdAt,
    prizes,
    formFields,
  }) {
    this.id = id;
    this.title = title;
    this.description = description ?? null;
    this.targetType = targetType;
    this.participationType = participationType;
    this.startAt = startAt;
    this.endAt = endAt;
    this.isPinned = isPinned;
    this.status = status;
    this.createdAt = createdAt;
    this.prizes = prizes || [];
    this.formFields = formFields || [];
  }

  isRoulette() {
    return this.participationType === PARTICIPATION_TYPE.ROULETTE;
  }

  isForm() {
    return this.participationType === PARTICIPATION_TYPE.FORM;
  }

  effectiveStatus(now = new Date()) {
    if (this.status === EVENT_STATUS.CLOSED) return EVENT_STATUS.CLOSED;
    if (now >= new Date(this.endAt)) return EVENT_STATUS.CLOSED;
    if (now >= new Date(this.startAt)) return EVENT_STATUS.ONGOING;
    return EVENT_STATUS.SCHEDULED;
  }

  isOngoing(now = new Date()) {
    return this.effectiveStatus(now) === EVENT_STATUS.ONGOING;
  }

  toJSON(now = new Date()) {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      targetType: this.targetType,
      participationType: this.participationType,
      startAt: this.startAt,
      endAt: this.endAt,
      isPinned: this.isPinned,
      status: this.effectiveStatus(now),
      createdAt: this.createdAt,
      prizes: this.prizes,
      formFields: this.formFields,
    };
  }
}

module.exports = Event;
