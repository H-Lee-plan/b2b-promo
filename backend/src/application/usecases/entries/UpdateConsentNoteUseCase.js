const { AppError } = require('../../../domain/errors/AppError');

class UpdateConsentNoteUseCase {
  constructor({ entryRepository }) {
    this.entryRepository = entryRepository;
  }

  async execute(entryId, consentNote) {
    if (typeof consentNote !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'consentNote는 문자열이어야 합니다.');
    }

    const updated = await this.entryRepository.updateConsentNote(entryId, consentNote);
    if (!updated) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 참여신청입니다.', 404);
    }
    return updated;
  }
}

module.exports = UpdateConsentNoteUseCase;
