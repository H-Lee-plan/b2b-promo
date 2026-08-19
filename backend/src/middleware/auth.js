const jwt = require('jsonwebtoken');
const { AppError } = require('../shared/errors');
const { loadEnv } = require('../config/env');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    next(new AppError('VALIDATION_ERROR', '인증이 필요합니다.', 401));
    return;
  }

  try {
    const env = loadEnv();
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    next(new AppError('VALIDATION_ERROR', '유효하지 않은 토큰입니다.', 401));
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      next(new AppError('VALIDATION_ERROR', '접근 권한이 없습니다.', 403));
      return;
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
