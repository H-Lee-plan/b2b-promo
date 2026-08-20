const { AppError } = require('../../../domain/errors/AppError');

class LogoutUseCase {
  constructor({ tokenService, refreshTokenRepository }) {
    this.tokenService = tokenService;
    this.refreshTokenRepository = refreshTokenRepository;
  }

  async execute({ refreshToken }) {
    if (!refreshToken) {
      throw new AppError('VALIDATION_ERROR', 'refreshToken이 필요합니다.', 401);
    }

    const userId = await this.refreshTokenRepository.deleteByTokenHash(
      this.tokenService.hashRefreshToken(refreshToken)
    );
    if (!userId) {
      throw new AppError('VALIDATION_ERROR', '유효하지 않은 Refresh Token입니다.', 401);
    }
  }
}

module.exports = LogoutUseCase;
