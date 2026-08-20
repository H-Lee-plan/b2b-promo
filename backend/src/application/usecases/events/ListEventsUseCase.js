class ListEventsUseCase {
  constructor({ eventRepository, prizeRepository }) {
    this.eventRepository = eventRepository;
    this.prizeRepository = prizeRepository;
  }

  async execute() {
    const events = await this.eventRepository.findAll();
    await Promise.all(
      events.map(async (event) => {
        event.prizes = event.isRoulette() ? await this.prizeRepository.findByEventId(event.id) : [];
      })
    );
    return events;
  }
}

module.exports = ListEventsUseCase;
