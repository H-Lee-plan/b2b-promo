const ERROR_STATUS = {
  DUPLICATE_ENTRY: 409,
  TARGET_TYPE_MISMATCH: 403,
  EVENT_CLOSED: 409,
  CONSENT_REQUIRED: 400,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
};

class AppError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
    this.status = ERROR_STATUS[code] || 500;
  }
}

module.exports = { AppError, ERROR_STATUS };
