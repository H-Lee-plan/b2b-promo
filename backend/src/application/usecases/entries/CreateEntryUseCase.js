const { AppError } = require('../../../domain/errors/AppError');
const { EVENT_STATUS, TARGET_TYPE } = require('../../../domain/enums');
const Entry = require('../../../domain/entities/Entry');
const { drawPrize } = require('../../../domain/services/drawPrize');
const { normalizeEmail, isValidEmailFormat } = require('../../../domain/services/normalizeEmail');

function validateGuestFields({ guestEmail, guestPhone, guestInfo }) {
  if (
    !guestEmail ||
    !isValidEmailFormat(guestEmail) ||
    !guestPhone ||
    !guestInfo ||
    typeof guestInfo !== 'object' ||
    !guestInfo.companyName ||
    !guestInfo.name ||
    !guestInfo.phone
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      '비회원 참여 시 guestEmail(형식 포함)/guestPhone/guestInfo가 모두 필요합니다.'
    );
  }
  return { guestEmail: normalizeEmail(guestEmail), guestPhone, guestInfo };
}

function validateFormData(formFields, formData) {
  if (!formData || typeof formData !== 'object') {
    throw new AppError('VALIDATION_ERROR', 'formData가 필요합니다.');
  }
  for (const field of formFields) {
    if (!formData[field] || typeof formData[field] !== 'string' || !formData[field].trim()) {
      throw new AppError('VALIDATION_ERROR', `필수 항목 "${field}"을(를) 입력해 주세요.`);
    }
  }
  return formData;
}

class CreateEntryUseCase {
  constructor({ eventRepository, prizeRepository, entryRepository, transactionManager }) {
    this.eventRepository = eventRepository;
    this.prizeRepository = prizeRepository;
    this.entryRepository = entryRepository;
    this.transactionManager = transactionManager;
  }

  async execute({ eventId, member, consent, guestEmail, guestPhone, guestInfo, formData, userAgent }) {
    return this.transactionManager.runInTransaction(async (tx) => {
      const event = await this.eventRepository.findById(eventId, tx);
      if (!event) {
        throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
      }

      if (event.effectiveStatus(new Date()) !== EVENT_STATUS.ONGOING) {
        throw new AppError('EVENT_CLOSED', '진행중인 이벤트가 아닙니다.');
      }

      if (event.targetType === TARGET_TYPE.MEMBER_ONLY && !member) {
        throw new AppError('TARGET_TYPE_MISMATCH', '회원 전용 이벤트입니다.');
      }
      if (event.targetType === TARGET_TYPE.GUEST_ONLY && member) {
        throw new AppError('TARGET_TYPE_MISMATCH', '비회원 전용 이벤트입니다.');
      }

      if (consent !== true) {
        throw new AppError('CONSENT_REQUIRED', '개인정보 동의가 필요합니다.');
      }

      const consentedAt = new Date();
      let normalizedGuestEmail = null;
      let finalGuestPhone = null;
      let finalGuestInfo = null;
      if (!member) {
        ({ guestEmail: normalizedGuestEmail, guestPhone: finalGuestPhone, guestInfo: finalGuestInfo } =
          validateGuestFields({ guestEmail, guestPhone, guestInfo }));
      }

      let finalFormData = null;
      if (event.isForm()) {
        finalFormData = validateFormData(event.formFields, formData);
      }

      let entry = member
        ? await this.entryRepository.insertMemberEntry(
            { eventId, userId: member.userId, consentedAt, userAgent, formData: finalFormData },
            tx
          )
        : await this.entryRepository.insertGuestEntry(
            {
              eventId,
              guestEmail: normalizedGuestEmail,
              guestPhone: finalGuestPhone,
              guestInfo: finalGuestInfo,
              formData: finalFormData,
              consentedAt,
              userAgent,
            },
            tx
          );

      if (!entry) {
        const existing = member
          ? await this.entryRepository.findExistingByMember(eventId, member.userId, tx)
          : await this.entryRepository.findExistingByGuestEmail(eventId, normalizedGuestEmail, tx);

        if (!existing) {
          throw new AppError('INTERNAL_ERROR', '참여신청 처리 중 오류가 발생했습니다.');
        }

        const decision = Entry.decideOnConflict(existing);
        if (decision === 'REAPPLY') {
          entry = await this.entryRepository.reapplyById(
            existing.id,
            { consentedAt, guestPhone: finalGuestPhone, guestInfo: finalGuestInfo, formData: finalFormData },
            tx
          );
          if (!entry) {
            // 동시에 들어온 다른 요청이 먼저 CANCELED→APPLIED 전환을 마친 경우
            throw new AppError('DUPLICATE_ENTRY', '이미 참여하셨습니다.');
          }
        } else {
          throw new AppError('DUPLICATE_ENTRY', '이미 참여하셨습니다.');
        }
      }

      if (event.isRoulette()) {
        const prizes = await this.prizeRepository.findByEventId(eventId, tx);
        const drawn = drawPrize(prizes);
        const status = Entry.statusForDrawnPrize(drawn);
        entry = await this.entryRepository.setRouletteResult(entry.id, { prizeId: drawn.id, status }, tx);
        entry.prize = drawn;
      }

      return entry;
    });
  }
}

module.exports = CreateEntryUseCase;
