const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usersQueries = require('../db/queries/usersQueries');
const refreshTokensQueries = require('../db/queries/refreshTokensQueries');
const { normalizeEmail } = require('../shared/normalizeEmail');
const { AppError } = require('../shared/errors');
const { loadEnv } = require('../config/env');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueTokenPair(user) {
  const env = loadEnv();
  const jti = crypto.randomUUID();
  const accessToken = jwt.sign({ userId: user.id, role: user.role, jti }, env.JWT_ACCESS_SECRET, {
    expiresIn: '1h',
  });
  const refreshToken = jwt.sign({ userId: user.id, jti }, env.JWT_REFRESH_SECRET, { expiresIn: '14d' });
  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId, refreshToken) {
  await refreshTokensQueries.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
}

function toPublicUser(user) {
  const { id, role, email, companyName, name, phone } = user;
  return { id, role, email, companyName, name, phone };
}

async function signup(req, res, next) {
  try {
    const { email, password, companyName, name, phone } = req.body || {};
    const normalizedEmail = email ? normalizeEmail(email) : '';
    if (
      !normalizedEmail ||
      !EMAIL_RE.test(normalizedEmail) ||
      !password ||
      password.length < 8 ||
      !companyName ||
      !name ||
      !phone
    ) {
      throw new AppError('VALIDATION_ERROR', '입력값을 확인해 주세요.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await usersQueries.createMember({
      email: normalizedEmail,
      passwordHash,
      companyName,
      name,
      phone,
    });

    if (!user) {
      throw new AppError('VALIDATION_ERROR', '이미 가입된 이메일입니다.');
    }

    res.status(201).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw new AppError('VALIDATION_ERROR', '이메일과 비밀번호를 입력해 주세요.');
    }

    const user = await usersQueries.findByEmail(normalizeEmail(email));
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !passwordOk) {
      throw new AppError('VALIDATION_ERROR', '이메일 또는 비밀번호가 일치하지 않습니다.', 401);
    }

    const { accessToken, refreshToken } = issueTokenPair(user);
    await storeRefreshToken(user.id, refreshToken);

    res.status(200).json({ accessToken, refreshToken, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      throw new AppError('VALIDATION_ERROR', 'refreshToken이 필요합니다.', 401);
    }

    let payload;
    try {
      const env = loadEnv();
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError('VALIDATION_ERROR', '유효하지 않은 Refresh Token입니다.', 401);
    }

    const userId = await refreshTokensQueries.deleteByTokenHash(hashToken(refreshToken));
    if (!userId) {
      throw new AppError('VALIDATION_ERROR', '이미 사용되었거나 폐기된 Refresh Token입니다.', 401);
    }

    const user = await usersQueries.findById(payload.userId);
    if (!user) {
      throw new AppError('VALIDATION_ERROR', '유효하지 않은 Refresh Token입니다.', 401);
    }

    const tokenPair = issueTokenPair(user);
    await storeRefreshToken(user.id, tokenPair.refreshToken);

    res.status(200).json(tokenPair);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      throw new AppError('VALIDATION_ERROR', 'refreshToken이 필요합니다.', 401);
    }

    const userId = await refreshTokensQueries.deleteByTokenHash(hashToken(refreshToken));
    if (!userId) {
      throw new AppError('VALIDATION_ERROR', '유효하지 않은 Refresh Token입니다.', 401);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, refresh, logout };
