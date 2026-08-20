const test = require('node:test');
const assert = require('node:assert');

const {
  TARGET_TYPE,
  PARTICIPATION_TYPE,
  EVENT_STATUS,
  ENTRY_STATUS,
  USER_ROLE,
} = require('../src/domain/enums');

test('Enum 상수 값이 프로젝트 원칙 3절 매핑표와 스펠링까지 일치한다', () => {
  assert.deepStrictEqual(TARGET_TYPE, { MEMBER_ONLY: 'MEMBER_ONLY', GUEST_ONLY: 'GUEST_ONLY', COMMON: 'COMMON' });
  assert.deepStrictEqual(PARTICIPATION_TYPE, { SIMPLE: 'SIMPLE', FORM: 'FORM', ROULETTE: 'ROULETTE' });
  assert.deepStrictEqual(EVENT_STATUS, { SCHEDULED: 'SCHEDULED', ONGOING: 'ONGOING', CLOSED: 'CLOSED' });
  assert.deepStrictEqual(ENTRY_STATUS, { APPLIED: 'APPLIED', CANCELED: 'CANCELED', WON: 'WON', LOST: 'LOST' });
  assert.deepStrictEqual(USER_ROLE, { ADMIN: 'ADMIN', MEMBER: 'MEMBER' });
});
