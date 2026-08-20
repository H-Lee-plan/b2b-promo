const { AppError } = require('../../../domain/errors/AppError');

class GetProfileUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 계정입니다.', 404);
    }
    return user;
  }
}

module.exports = GetProfileUseCase;
