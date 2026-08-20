const { AppError } = require('../../../domain/errors/AppError');
const { EVENT_STATUS, PARTICIPATION_TYPE } = require('../../../domain/enums');
const { validateEventFields, validatePrizeList, validateFormFields } = require('./validateEventInput');

class UpdateEventUseCase {
  constructor({ eventRepository, prizeRepository, transactionManager }) {
    this.eventRepository = eventRepository;
    this.prizeRepository = prizeRepository;
    this.transactionManager = transactionManager;
  }

  async execute(eventId, body) {
    const existing = await this.eventRepository.findById(eventId);
    if (!existing) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }

    const now = new Date();
    const effectiveStatus = existing.effectiveStatus(now);
    if (effectiveStatus === EVENT_STATUS.CLOSED) {
      throw new AppError('VALIDATION_ERROR', '종료된 이벤트는 수정할 수 없습니다.');
    }

    if (effectiveStatus === EVENT_STATUS.ONGOING) {
      if ('targetType' in body || 'participationType' in body || 'startAt' in body) {
        throw new AppError(
          'VALIDATION_ERROR',
          '진행중 이벤트는 참여대상유형/참여방식/시작일시를 변경할 수 없습니다.'
        );
      }
      if ('prizes' in body) {
        // 진행중 이벤트는 이미 참여신청이 확정 경품(prizeId)을 참조하고 있을 수 있다.
        // 경품을 교체하면 DELETE+INSERT로 인해 기존 참조가 ON DELETE SET NULL로 끊어지므로
        // (도메인 6절 "확정된 결과는 재추첨 불가·영구 보존") 진행중에는 경품 수정 자체를 막는다.
        throw new AppError('VALIDATION_ERROR', '진행중 이벤트는 경품 목록을 변경할 수 없습니다.');
      }
      if ('formFields' in body) {
        throw new AppError('VALIDATION_ERROR', '진행중 이벤트는 폼 필드 목록을 변경할 수 없습니다.');
      }
    }

    const merged = validateEventFields({
      title: body.title ?? existing.title,
      description: 'description' in body ? body.description : existing.description,
      targetType: body.targetType ?? existing.targetType,
      participationType: body.participationType ?? existing.participationType,
      startAt: body.startAt ?? existing.startAt,
      endAt: body.endAt ?? existing.endAt,
      isPinned: 'isPinned' in body ? body.isPinned : existing.isPinned,
    });

    let finalFormFields;
    if (merged.participationType === PARTICIPATION_TYPE.FORM) {
      finalFormFields = body.formFields !== undefined ? validateFormFields(body.formFields) : existing.formFields;
      if (!finalFormFields || finalFormFields.length < 1) {
        throw new AppError('VALIDATION_ERROR', '폼 제출형은 필드가 1건 이상 필요합니다.');
      }
    } else {
      finalFormFields = [];
    }

    if (effectiveStatus === EVENT_STATUS.ONGOING && body.endAt) {
      if (merged.endAt <= new Date(existing.endAt)) {
        throw new AppError('VALIDATION_ERROR', '진행중 이벤트의 종료일시는 연장만 가능합니다.');
      }
    }

    // prizesToPersist === null이면 기존 경품 행을 건드리지 않는다(요청에 prizes가 실제로
    // 포함된 경우에만 교체해 FK로 참조 중인 prizeId가 불필요하게 끊어지지 않도록 한다).
    let prizesToPersist = null;
    if (merged.participationType === PARTICIPATION_TYPE.ROULETTE) {
      if (body.prizes !== undefined) {
        prizesToPersist = validatePrizeList(body.prizes);
      } else {
        const existingPrizes = await this.prizeRepository.findByEventId(eventId);
        if (existingPrizes.length < 1) {
          throw new AppError('VALIDATION_ERROR', '룰렛 게임형은 경품이 1건 이상 필요합니다.');
        }
      }
    } else {
      const existingPrizes = await this.prizeRepository.findByEventId(eventId);
      prizesToPersist = existingPrizes.length > 0 ? [] : null;
    }

    const updated = await this.transactionManager.runInTransaction(async (tx) => {
      const result = await this.eventRepository.update(eventId, { ...merged, formFields: finalFormFields }, tx);
      if (prizesToPersist !== null) {
        await this.prizeRepository.replaceForEvent(eventId, prizesToPersist, tx);
      }
      return result;
    });

    updated.prizes = updated.isRoulette() ? await this.prizeRepository.findByEventId(eventId) : [];
    return updated;
  }
}

module.exports = UpdateEventUseCase;
