const test = require('node:test');
const assert = require('node:assert');
const { validateEnv, loadEnv, REQUIRED_KEYS } = require('../src/config/env');

function fullSource() {
  return {
    DB_CONN_STRING: 'postgresql://localhost/db',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    ADMIN_SEED_EMAIL: 'admin@example.com',
    ADMIN_SEED_PASSWORD: 'password123',
  };
}

test('validateEnv: 모든 키가 있으면 ok: true와 env 객체를 반환한다', () => {
  const source = fullSource();
  const result = validateEnv(source);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(result.env, fullSource());
});

test('validateEnv: 키가 1개씩 빠진 경우 ok: false와 해당 키만 missingKeys에 포함된다', () => {
  for (const key of REQUIRED_KEYS) {
    const source = fullSource();
    delete source[key];
    const result = validateEnv(source);
    assert.strictEqual(result.ok, false);
    assert.deepStrictEqual(result.missingKeys, [key]);
  }
});

test('validateEnv: 빈 문자열인 키도 누락으로 취급한다', () => {
  const source = fullSource();
  source.DB_CONN_STRING = '';
  const result = validateEnv(source);
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(result.missingKeys, ['DB_CONN_STRING']);
});

test('validateEnv: 여러 키가 동시에 빠지면 missingKeys에 전부 포함된다', () => {
  const source = fullSource();
  delete source.JWT_ACCESS_SECRET;
  delete source.ADMIN_SEED_PASSWORD;
  const result = validateEnv(source);
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(result.missingKeys, ['JWT_ACCESS_SECRET', 'ADMIN_SEED_PASSWORD']);
});

test('loadEnv: 모든 키가 있으면 env 객체를 반환하고 exit을 호출하지 않는다', () => {
  const source = fullSource();
  let exitCalled = false;
  const exit = () => {
    exitCalled = true;
    throw new Error('exit should not be called');
  };
  const log = () => {};

  const result = loadEnv({ source, exit, log });

  assert.strictEqual(exitCalled, false);
  assert.deepStrictEqual(result, fullSource());
});

test('loadEnv: 키가 누락되면 exit(1)을 호출하고 log에 누락 키 이름이 포함되며 undefined를 반환한다', () => {
  const source = fullSource();
  delete source.ADMIN_SEED_EMAIL;

  const exitCalls = [];
  const exit = (code) => {
    exitCalls.push(code);
  };
  const logCalls = [];
  const log = (msg) => {
    logCalls.push(msg);
  };

  const result = loadEnv({ source, exit, log });

  assert.deepStrictEqual(exitCalls, [1]);
  assert.strictEqual(logCalls.length, 1);
  assert.ok(logCalls[0].includes('ADMIN_SEED_EMAIL'));
  assert.strictEqual(result, undefined);
});
