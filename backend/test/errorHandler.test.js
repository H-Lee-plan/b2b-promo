const test = require('node:test');
const assert = require('node:assert');
const express = require('express');

const { AppError } = require('../src/domain/errors/AppError');
const errorHandler = require('../src/interfaces/http/middleware/errorHandler');

function buildApp() {
  const app = express();
  app.get('/app-error', () => {
    throw new AppError('EVENT_CLOSED', '종료된 이벤트입니다.');
  });
  app.get('/unexpected', () => {
    throw new Error('boom');
  });
  app.use(errorHandler);
  return app;
}

test('AppError는 지정된 코드/상태/메시지로 응답한다', async () => {
  const app = buildApp();
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/app-error`);
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.deepStrictEqual(body, { error: { code: 'EVENT_CLOSED', message: '종료된 이벤트입니다.' } });
  } finally {
    server.close();
  }
});

test('처리되지 않은 예외는 스택 노출 없이 500 INTERNAL_ERROR로 통일된다', async () => {
  const app = buildApp();
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/unexpected`);
    assert.strictEqual(res.status, 500);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'INTERNAL_ERROR');
    assert.ok(!JSON.stringify(body).includes('boom'));
    assert.ok(!JSON.stringify(body).includes('at '));
  } finally {
    server.close();
  }
});
