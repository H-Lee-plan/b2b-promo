const { AppError } = require('../../../domain/errors/AppError');

class ListEntriesUseCase {
  constructor({ eventRepository, entryRepository }) {
    this.eventRepository = eventRepository;
    this.entryRepository = entryRepository;
  }

  async execute(eventId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 이벤트입니다.', 404);
    }
    return this.entryRepository.findByEventId(eventId);
  }
}

module.exports = ListEntriesUseCase;
