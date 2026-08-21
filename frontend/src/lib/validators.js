const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{10,11}$/;

export const FIELD_MAX_LENGTH = {
  email: 100,
  password: 64,
  companyName: 50,
  name: 30,
  phone: 11,
};

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value);
}

export function isValidPhone(value) {
  return PHONE_PATTERN.test(value);
}

/** 연락처 입력에서 숫자만 남기고 최대 11자리로 자른다. */
export function sanitizePhoneInput(value) {
  return value.replace(/\D/g, '').slice(0, FIELD_MAX_LENGTH.phone);
}
