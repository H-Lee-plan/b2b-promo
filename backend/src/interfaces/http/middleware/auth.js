const { AppError } = require('../../../domain/errors/AppError');

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** tokenService(application/ports/TokenService 구현체)를 주입받아 인증 미들웨어 3종을 만든다. */
function createAuthMiddleware(tokenService) {
  function requireAuth(req, res, next) {
    const token = readBearerToken(req);
    if (!token) {
      next(new AppError('VALIDATION_ERROR', '인증이 필요합니다.', 401));
      return;
    }
    try {
      const payload = tokenService.verifyAccessToken(token);
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

  /** 인증이 필수는 아니지만(비회원 참여 허용), 토큰이 있으면 검증해 회원 여부를 판별한다. */
  function optionalAuth(req, res, next) {
    const token = readBearerToken(req);
    if (!token) {
      req.member = null;
      next();
      return;
    }
    try {
      const payload = tokenService.verifyAccessToken(token);
      req.member = { userId: payload.userId, role: payload.role };
      next();
    } catch (err) {
      next(new AppError('VALIDATION_ERROR', '유효하지 않은 토큰입니다.', 401));
    }
  }

  return { requireAuth, requireRole, optionalAuth };
}

module.exports = { createAuthMiddleware };
