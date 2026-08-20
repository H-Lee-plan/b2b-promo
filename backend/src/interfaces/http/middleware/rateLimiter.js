const rateLimit = require('express-rate-limit');

const loginRateLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'VALIDATION_ERROR', message: '로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.' },
    });
  },
});

module.exports = { loginRateLimiter };
