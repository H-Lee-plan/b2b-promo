const test = require('node:test');
const assert = require('node:assert');

// 실제 backend/.env 파일이 5개 필수 키를 모두 가지고 있음을 전제로,
// loadEnv()가 통과되어 pool 모듈이 예외 없이 로드되는지만 확인한다.
// 실제 DB 연결/쿼리는 수행하지 않는다.

test('pool 모듈이 예외 없이 로드된다', () => {
  assert.doesNotThrow(() => {
    require('../src/db/pool');
  });
});

test('pool은 query 함수를 가진다', () => {
  const pool = require('../src/db/pool');
  assert.strictEqual(typeof pool.query, 'function');
});

test('pool의 error 핸들러는 예외를 던지지 않는다', () => {
  const pool = require('../src/db/pool');
  assert.doesNotThrow(() => {
    pool.emit('error', new Error('테스트용 idle client 에러'));
  });
});
