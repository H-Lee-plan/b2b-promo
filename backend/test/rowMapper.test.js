const test = require('node:test');
const assert = require('node:assert');

const { mapRow, mapRows } = require('../src/infrastructure/db/rowMapper');

test('mapRow는 snake_case 키를 camelCase로 변환한다', () => {
  assert.deepStrictEqual(mapRow({ user_id: 1, created_at: '2026-08-13' }), {
    userId: 1,
    createdAt: '2026-08-13',
  });
});

test('mapRows는 여러 행을 동일하게 변환한다', () => {
  assert.deepStrictEqual(mapRows([{ event_id: 1 }, { event_id: 2 }]), [
    { eventId: 1 },
    { eventId: 2 },
  ]);
});
