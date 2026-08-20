const { PARTICIPATION_TYPE } = require('../../../domain/enums');
const { validateEventFields, validatePrizeList, validateFormFields } = require('./validateEventInput');

class CreateEventUseCase {
  constructor({ eventRepository, prizeRepository, transactionManager }) {
    this.eventRepository = eventRepository;
    this.prizeRepository = prizeRepository;
    this.transactionManager = transactionManager;
  }

  async execute(input) {
    const fields = validateEventFields(input);
    const prizes = fields.participationType === PARTICIPATION_TYPE.ROULETTE ? validatePrizeList(input.prizes) : [];
    const formFields = fields.participationType === PARTICIPATION_TYPE.FORM ? validateFormFields(input.formFields) : [];

    const event = await this.transactionManager.runInTransaction(async (tx) => {
      const created = await this.eventRepository.insert({ ...fields, formFields }, tx);
      if (prizes.length > 0) {
        await this.prizeRepository.replaceForEvent(created.id, prizes, tx);
      }
      return created;
    });

    event.prizes = event.isRoulette() ? await this.prizeRepository.findByEventId(event.id) : [];
    return event;
  }
}

module.exports = CreateEventUseCase;
