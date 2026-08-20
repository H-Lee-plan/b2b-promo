class ListMyEntriesUseCase {
  constructor({ entryRepository }) {
    this.entryRepository = entryRepository;
  }

  execute(userId) {
    return this.entryRepository.findByUserId(userId);
  }
}

module.exports = ListMyEntriesUseCase;
