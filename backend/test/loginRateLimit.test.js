process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '8000';
process.env.LOGIN_RATE_LIMIT_MAX = '3';

const test = require('node:test');
const assert = require('node:assert');

const app = require('../src/server');

async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
}

function login(port, password = 'wrong-password') {
  return fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@corp.com', password }),
  });
}

function signup(port) {
  return fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@corp.com', password: 'x', companyName: 'x', name: 'x', phone: '010-0000-0000' }),
  });
}

// rate limiter의 카운터는 모듈(process) 단위로 공유되므로 한 테스트 안에서 순서대로 검증한다.
test('로그인 rate limit: 반복 시도 시 429, 다른 라우트는 영향 없음, 윈도우 만료 후 재시도 가능', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  t.after(() => server.close());

  for (let i = 0; i < 3; i += 1) {
    const res = await login(port);
    assert.notStrictEqual(res.status, 429, `${i + 1}번째 시도는 제한에 걸리지 않아야 함`);
  }

  const blocked = await login(port);
  assert.strictEqual(blocked.status, 429);
  const body = await blocked.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');

  const signupRes = await signup(port);
  assert.notStrictEqual(signupRes.status, 429);

  await new Promise((resolve) => setTimeout(resolve, 8500));

  const afterWindow = await login(port);
  assert.notStrictEqual(afterWindow.status, 429);
});
