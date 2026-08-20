const { AppError } = require('../../../domain/errors/AppError');
const { EVENT_STATUS, ENTRY_STATUS, PARTICIPATION_TYPE } = require('../../../domain/enums');

class CancelEntryUseCase {
  constructor({ entryRepository }) {
    this.entryRepository = entryRepository;
  }

  async execute(userId, entryId) {
    const entry = await this.entryRepository.findOwnEntryWithEvent(entryId, userId);
    if (!entry) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 참여신청입니다.', 404);
    }

    // 룰렛 게임형은 도메인 6절에 따라 취소 자체를 거부한다(엔드포인트는 존재하되 항상 거부).
    if (entry.event.participationType === PARTICIPATION_TYPE.ROULETTE) {
      throw new AppError('VALIDATION_ERROR', '룰렛 게임형 참여신청은 취소할 수 없습니다.');
    }

    if (entry.event.effectiveStatus(new Date()) === EVENT_STATUS.CLOSED) {
      throw new AppError('EVENT_CLOSED', '종료된 이벤트의 신청은 취소할 수 없습니다.');
    }

    if (entry.status !== ENTRY_STATUS.APPLIED) {
      throw new AppError('VALIDATION_ERROR', '취소할 수 있는 상태가 아닙니다.');
    }

    const canceled = await this.entryRepository.cancelById(entry.id);
    if (!canceled) {
      throw new AppError('VALIDATION_ERROR', '취소할 수 있는 상태가 아닙니다.');
    }
    return canceled;
  }
}

module.exports = CancelEntryUseCase;
