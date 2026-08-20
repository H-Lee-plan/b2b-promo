class PrizeRepository {
  findByEventId(_eventId, _tx) {
    throw new Error('Not implemented');
  }

  replaceForEvent(_eventId, _prizes, _tx) {
    throw new Error('Not implemented');
  }
}

module.exports = PrizeRepository;
