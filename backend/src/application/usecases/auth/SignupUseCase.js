const { AppError } = require('../../../domain/errors/AppError');
const { normalizeEmail, isValidEmailFormat } = require('../../../domain/services/normalizeEmail');

class SignupUseCase {
  constructor({ userRepository, passwordHasher }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  async execute({ email, password, companyName, name, phone }) {
    const normalizedEmail = email ? normalizeEmail(email) : '';
    if (
      !normalizedEmail ||
      !isValidEmailFormat(normalizedEmail) ||
      !password ||
      password.length < 8 ||
      !companyName ||
      !name ||
      !phone
    ) {
      throw new AppError('VALIDATION_ERROR', '입력값을 확인해 주세요.');
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.userRepository.createMember({
      email: normalizedEmail,
      passwordHash,
      companyName,
      name,
      phone,
    });

    if (!user) {
      throw new AppError('VALIDATION_ERROR', '이미 가입된 이메일입니다.');
    }

    return user;
  }
}

module.exports = SignupUseCase;
