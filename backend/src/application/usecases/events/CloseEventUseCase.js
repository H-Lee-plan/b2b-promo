const { AppError } = require('../../../domain/errors/AppError');
const { EVENT_STATUS } = require('../../../domain/enums');

class CloseEventUseCase {
  constructor({ eventRepository, prizeRepository }) {
    this.eventRepository = eventRepository;
    this.prizeRepository = prizeRepository;
  }

  async execute(eventId) {
    const existing = await this.eventRepository.findById(eventId);
    if (!existing) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }

    if (existing.effectiveStatus(new Date()) !== EVENT_STATUS.ONGOING) {
      throw new AppError('VALIDATION_ERROR', '진행중인 이벤트만 종료할 수 있습니다.');
    }

    const closed = await this.eventRepository.close(eventId);
    closed.prizes = closed.isRoulette() ? await this.prizeRepository.findByEventId(eventId) : [];
    return closed;
  }
}

module.exports = CloseEventUseCase;
