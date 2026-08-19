const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function isValidEmailFormat(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

module.exports = { normalizeEmail, isValidEmailFormat };
