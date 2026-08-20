class EntryRepository {
  findByEventId(_eventId, _tx) {
    throw new Error('Not implemented');
  }

  findByUserId(_userId, _tx) {
    throw new Error('Not implemented');
  }

  findOwnEntryWithEvent(_entryId, _userId, _tx) {
    throw new Error('Not implemented');
  }

  findExistingByMember(_eventId, _userId, _tx) {
    throw new Error('Not implemented');
  }

  findExistingByGuestEmail(_eventId, _guestEmail, _tx) {
    throw new Error('Not implemented');
  }

  insertMemberEntry(_data, _tx) {
    throw new Error('Not implemented');
  }

  insertGuestEntry(_data, _tx) {
    throw new Error('Not implemented');
  }

  reapplyById(_id, _data, _tx) {
    throw new Error('Not implemented');
  }

  setRouletteResult(_id, _data, _tx) {
    throw new Error('Not implemented');
  }

  cancelById(_id, _tx) {
    throw new Error('Not implemented');
  }

  updateConsentNote(_id, _consentNote) {
    throw new Error('Not implemented');
  }
}

module.exports = EntryRepository;
