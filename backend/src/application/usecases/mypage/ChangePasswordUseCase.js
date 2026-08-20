const { AppError } = require('../../../domain/errors/AppError');

class ChangePasswordUseCase {
  constructor({ userRepository, passwordHasher }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  async execute(userId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      throw new AppError('VALIDATION_ERROR', '현재 비밀번호와 8자 이상의 새 비밀번호가 필요합니다.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('VALIDATION_ERROR', '존재하지 않는 계정입니다.', 404);
    }

    const currentOk = await this.passwordHasher.compare(currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new AppError('VALIDATION_ERROR', '현재 비밀번호가 일치하지 않습니다.', 401);
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.updatePasswordHash(userId, passwordHash);
  }
}

module.exports = ChangePasswordUseCase;
