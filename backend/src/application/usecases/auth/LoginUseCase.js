const { AppError } = require('../../../domain/errors/AppError');
const { normalizeEmail } = require('../../../domain/services/normalizeEmail');

class LoginUseCase {
  constructor({ userRepository, passwordHasher, tokenService, refreshTokenRepository }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
    this.refreshTokenRepository = refreshTokenRepository;
  }

  async execute({ email, password }) {
    if (!email || !password) {
      throw new AppError('VALIDATION_ERROR', '이메일과 비밀번호를 입력해 주세요.');
    }

    const user = await this.userRepository.findByEmail(normalizeEmail(email));
    const passwordOk = user ? await this.passwordHasher.compare(password, user.passwordHash) : false;
    if (!user || !passwordOk) {
      throw new AppError('VALIDATION_ERROR', '이메일 또는 비밀번호가 일치하지 않습니다.', 401);
    }

    const { accessToken, refreshToken, refreshTokenExpiresAt } = this.tokenService.issueTokenPair(user);
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.tokenService.hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });

    return { accessToken, refreshToken, user };
  }
}

module.exports = LoginUseCase;
