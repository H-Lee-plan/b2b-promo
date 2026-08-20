const { AppError } = require('../../../domain/errors/AppError');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
}

module.exports = errorHandler;
