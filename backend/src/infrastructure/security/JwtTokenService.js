const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const TokenService = require('../../application/ports/TokenService');

const DURATION_UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

function parseDurationMs(duration) {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  if (!match) {
    throw new Error(`잘못된 만료 시간 형식입니다: ${duration}`);
  }
  return Number(match[1]) * DURATION_UNIT_MS[match[2]];
}

class JwtTokenService extends TokenService {
  constructor({ secret, accessExpiresIn, refreshExpiresIn }) {
    super();
    this.secret = secret;
    this.accessExpiresIn = accessExpiresIn;
    this.refreshExpiresIn = refreshExpiresIn;
  }

  issueTokenPair(user) {
    const jti = crypto.randomUUID();
    const accessToken = jwt.sign({ userId: user.id, role: user.role, jti }, this.secret, {
      expiresIn: this.accessExpiresIn,
    });
    const refreshToken = jwt.sign({ userId: user.id, jti }, this.secret, { expiresIn: this.refreshExpiresIn });
    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: new Date(Date.now() + parseDurationMs(this.refreshExpiresIn)),
    };
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.secret);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.secret);
  }

  hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = JwtTokenService;
