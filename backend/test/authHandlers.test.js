const test = require('node:test');
const assert = require('node:assert');

const app = require('../src/server');
const pool = require('../src/infrastructure/db/pool');

function uniqueEmail() {
  return `be3-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
}

async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
}

async function deleteTestUser(email) {
  await pool.query('DELETE FROM users WHERE email = $1', [email.trim().toLowerCase()]);
}

const SIGNUP_BODY = { password: 'password123', companyName: '테스트업체', name: '홍길동', phone: '010-1234-5678' };

test('회원가입 → 로그인 시 accessToken/refreshToken 두 개를 응답 바디로 받는다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const email = uniqueEmail();
  t.after(async () => {
    server.close();
    await deleteTestUser(email);
  });

  const signupRes = await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, ...SIGNUP_BODY }),
  });
  assert.strictEqual(signupRes.status, 201);
  assert.strictEqual(signupRes.headers.get('set-cookie'), null);

  const loginRes = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: SIGNUP_BODY.password }),
  });
  assert.strictEqual(loginRes.status, 200);
  assert.strictEqual(loginRes.headers.get('set-cookie'), null);
  const body = await loginRes.json();
  assert.ok(typeof body.accessToken === 'string' && body.accessToken.length > 0);
  assert.ok(typeof body.refreshToken === 'string' && body.refreshToken.length > 0);
  assert.strictEqual(body.user.email, email);
});

test('비밀번호 7자로 가입 시 VALIDATION_ERROR(400)로 거부된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const email = uniqueEmail();
  t.after(async () => {
    server.close();
    await deleteTestUser(email);
  });

  const res = await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, ...SIGNUP_BODY, password: '1234567' }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
});

test('이미 가입된 이메일로 재가입 시 거부되고 메시지가 "이미 가입된 이메일" 취지다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const email = uniqueEmail();
  t.after(async () => {
    server.close();
    await deleteTestUser(email);
  });

  await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, ...SIGNUP_BODY }),
  });

  const res = await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, ...SIGNUP_BODY }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.error.message.includes('이미 가입된 이메일'));
});

test('대소문자·앞뒤 공백만 다른 이메일로 재가입 시에도 중복으로 거부된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const email = uniqueEmail();
  t.after(async () => {
    server.close();
    await deleteTestUser(email);
  });

  await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, ...SIGNUP_BODY }),
  });

  const variantEmail = ` ${email.toUpperCase()} `;
  const res = await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: variantEmail, ...SIGNUP_BODY }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.error.message.includes('이미 가입된 이메일'));
});

test('잘못된 비밀번호 로그인 시 이메일/비밀번호 중 무엇이 틀렸는지 구분해 알려주지 않는다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const email = uniqueEmail();
  t.after(async () => {
    server.close();
    await deleteTestUser(email);
  });

  await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, ...SIGNUP_BODY }),
  });

  const wrongPasswordRes = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'wrong-password' }),
  });
  const wrongEmailRes = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail(), password: SIGNUP_BODY.password }),
  });

  assert.strictEqual(wrongPasswordRes.status, 401);
  assert.strictEqual(wrongEmailRes.status, 401);
  const [wrongPasswordBody, wrongEmailBody] = await Promise.all([wrongPasswordRes.json(), wrongEmailRes.json()]);
  assert.strictEqual(wrongPasswordBody.error.message, wrongEmailBody.error.message);
});

test('Refresh로 재발급 시 새 Access가 발급되고 같은 Refresh를 다시 쓰면 실패한다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const email = uniqueEmail();
  t.after(async () => {
    server.close();
    await deleteTestUser(email);
  });

  await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, ...SIGNUP_BODY }),
  });
  const loginRes = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: SIGNUP_BODY.password }),
  });
  const { refreshToken, accessToken } = await loginRes.json();

  const refreshRes = await fetch(`http://localhost:${port}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  assert.strictEqual(refreshRes.status, 200);
  const newTokens = await refreshRes.json();
  assert.ok(typeof newTokens.accessToken === 'string');
  assert.notStrictEqual(newTokens.accessToken, accessToken);

  const reuseRes = await fetch(`http://localhost:${port}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  assert.strictEqual(reuseRes.status, 401);
});

test('로그아웃 후 해당 Refresh로 재발급이 실패한다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const email = uniqueEmail();
  t.after(async () => {
    server.close();
    await deleteTestUser(email);
  });

  await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, ...SIGNUP_BODY }),
  });
  const loginRes = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: SIGNUP_BODY.password }),
  });
  const { refreshToken } = await loginRes.json();

  const logoutRes = await fetch(`http://localhost:${port}/api/auth/logout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  assert.strictEqual(logoutRes.status, 204);

  const refreshRes = await fetch(`http://localhost:${port}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  assert.strictEqual(refreshRes.status, 401);
});
