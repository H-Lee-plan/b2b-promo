const { AppError } = require('../../../domain/errors/AppError');

class UpdateProfileUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userId, { companyName, name, phone }) {
    if (!companyName || !name || !phone) {
      throw new AppError('VALIDATION_ERROR', 'companyName/name/phone은 필수입니다.');
    }
    return this.userRepository.updateProfile(userId, { companyName, name, phone });
  }
}

module.exports = UpdateProfileUseCase;
