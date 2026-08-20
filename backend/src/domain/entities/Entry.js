const { ENTRY_STATUS } = require('../enums');

const LOSING_PRIZE_NAME = '미당첨';

class Entry {
  constructor({
    id,
    eventId,
    userId,
    guestEmail,
    guestPhone,
    guestInfo,
    formData,
    consentedAt,
    status,
    prizeId,
    appliedAt,
    userAgent,
    consentNote,
    prize,
    user,
    event,
  }) {
    this.id = id;
    this.eventId = eventId;
    this.userId = userId ?? null;
    this.guestEmail = guestEmail ?? null;
    this.guestPhone = guestPhone ?? null;
    this.guestInfo = guestInfo ?? null;
    this.formData = formData ?? null;
    this.consentedAt = consentedAt;
    this.status = status;
    this.prizeId = prizeId ?? null;
    this.appliedAt = appliedAt;
    this.userAgent = userAgent ?? null;
    this.consentNote = consentNote ?? null;
    this.prize = prize ?? null;
    // user는 명시적으로 전달된 경우(목록 조회: 객체 또는 null)에만 설정한다.
    // 인자 자체가 없는 경우(생성/재신청/추첨 결과 갱신)와 구분해야 toJSON에서
    // "회원 여부 알 수 없음(필드 생략)"과 "비회원이라 null"을 다르게 표현할 수 있다.
    this.user = user;
    this.event = event ?? null;
  }

  /** 기존 (이벤트, 참여자) 레코드와 충돌했을 때 재신청 전환할지 중복으로 거부할지 판정한다. */
  static decideOnConflict(existingEntry) {
    if (existingEntry.status === ENTRY_STATUS.CANCELED) {
      return 'REAPPLY';
    }
    return 'REJECT_DUPLICATE';
  }

  static statusForDrawnPrize(prize) {
    return prize.name === LOSING_PRIZE_NAME ? ENTRY_STATUS.LOST : ENTRY_STATUS.WON;
  }

  toJSON() {
    const json = {
      id: this.id,
      eventId: this.eventId,
      userId: this.userId,
      guestEmail: this.guestEmail,
      guestPhone: this.guestPhone,
      guestInfo: this.guestInfo,
      formData: this.formData,
      consentedAt: this.consentedAt,
      status: this.status,
      prizeId: this.prizeId,
      prize: this.prize,
      appliedAt: this.appliedAt,
      consentNote: this.consentNote,
    };
    if (this.user !== undefined) {
      json.user = this.user;
    }
    return json;
  }

  toMypageJSON() {
    return {
      id: this.id,
      eventId: this.eventId,
      consentedAt: this.consentedAt,
      status: this.status,
      prizeId: this.prizeId,
      prize: this.prize,
      appliedAt: this.appliedAt,
    };
  }
}

module.exports = Entry;
