const { AppError } = require('../../../domain/errors/AppError');

class GetEventUseCase {
  constructor({ eventRepository, prizeRepository }) {
    this.eventRepository = eventRepository;
    this.prizeRepository = prizeRepository;
  }

  async execute(eventId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }
    event.prizes = event.isRoulette() ? await this.prizeRepository.findByEventId(event.id) : [];
    return event;
  }
}

module.exports = GetEventUseCase;
