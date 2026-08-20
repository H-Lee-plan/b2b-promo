const { AppError } = require('../../../domain/errors/AppError');

class RefreshTokenUseCase {
  constructor({ userRepository, tokenService, refreshTokenRepository }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.refreshTokenRepository = refreshTokenRepository;
  }

  async execute({ refreshToken }) {
    if (!refreshToken) {
      throw new AppError('VALIDATION_ERROR', 'refreshToken이 필요합니다.', 401);
    }

    let payload;
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new AppError('VALIDATION_ERROR', '유효하지 않은 Refresh Token입니다.', 401);
    }

    const userId = await this.refreshTokenRepository.deleteByTokenHash(
      this.tokenService.hashRefreshToken(refreshToken)
    );
    if (!userId) {
      throw new AppError('VALIDATION_ERROR', '이미 사용되었거나 폐기된 Refresh Token입니다.', 401);
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new AppError('VALIDATION_ERROR', '유효하지 않은 Refresh Token입니다.', 401);
    }

    const tokenPair = this.tokenService.issueTokenPair(user);
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.tokenService.hashRefreshToken(tokenPair.refreshToken),
      expiresAt: tokenPair.refreshTokenExpiresAt,
    });

    return { accessToken: tokenPair.accessToken, refreshToken: tokenPair.refreshToken };
  }
}

module.exports = RefreshTokenUseCase;
