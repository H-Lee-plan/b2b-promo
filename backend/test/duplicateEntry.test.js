const test = require('node:test');
const assert = require('node:assert');

const Entry = require('../src/domain/entities/Entry');

test('기존 상태가 APPLIED/WON/LOST면 재신청을 거부(REJECT_DUPLICATE)로 판정한다', () => {
  for (const status of ['APPLIED', 'WON', 'LOST']) {
    assert.strictEqual(Entry.decideOnConflict({ status }), 'REJECT_DUPLICATE');
  }
});

test('기존 상태가 CANCELED면 새 레코드 생성이 아니라 재신청 전환(REAPPLY)으로 판정한다', () => {
  assert.strictEqual(Entry.decideOnConflict({ status: 'CANCELED' }), 'REAPPLY');
});
