const { AppError } = require('../../../domain/errors/AppError');

class DeleteEventUseCase {
  constructor({ eventRepository }) {
    this.eventRepository = eventRepository;
  }

  async execute(eventId) {
    const deleted = await this.eventRepository.delete(eventId);
    if (!deleted) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }
  }
}

module.exports = DeleteEventUseCase;
