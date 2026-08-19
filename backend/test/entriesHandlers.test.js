const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const pool = require('../src/db/pool');
const { loadEnv } = require('../src/config/env');

const HOUR_MS = 60 * 60 * 1000;

async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
}

function adminToken() {
  const env = loadEnv();
  return jwt.sign({ userId: 'test-admin', role: 'ADMIN' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
}

function baseEventBody(overrides = {}) {
  return {
    title: `BE-5 테스트 이벤트 ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    targetType: 'COMMON',
    participationType: 'SIMPLE',
    startAt: new Date(Date.now() - HOUR_MS).toISOString(),
    endAt: new Date(Date.now() + HOUR_MS).toISOString(),
    isPinned: false,
    ...overrides,
  };
}

async function createEvent(port, overrides) {
  const res = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(baseEventBody(overrides)),
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`이벤트 생성 실패: ${JSON.stringify(body)}`);
  return body;
}

async function cleanupEvent(eventId) {
  if (!eventId) return;
  await pool.query('DELETE FROM entries WHERE event_id = $1', [eventId]);
  await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
}

function guestBody(overrides = {}) {
  const email = `be5-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
  return {
    consent: true,
    guestEmail: email,
    guestPhone: '010-1234-5678',
    guestInfo: { companyName: '테스트업체', name: '홍길동', phone: '010-1234-5678' },
    ...overrides,
  };
}

async function signupAndLoginMember(port) {
  const email = `be5-member-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
  await fetch(`http://localhost:${port}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password123',
      companyName: '테스트업체',
      name: '김철수',
      phone: '010-1111-2222',
    }),
  });
  const loginRes = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  const { accessToken, user } = await loginRes.json();
  return { accessToken, userId: user.id, email };
}

async function cleanupMember(email) {
  if (!email) return;
  await pool.query('DELETE FROM users WHERE email = $1', [email.trim().toLowerCase()]);
}

const ROULETTE_PRIZES = [
  { name: '1등', weight: 1 },
  { name: '미당첨', weight: 1 },
];

test('비회원이 진행중 공통 이벤트에 참여 시 신청이 생성되고 룰렛 결과가 응답에 포함된다(S-1)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'ROULETTE', prizes: ROULETTE_PRIZES });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody()),
  });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.ok(['WON', 'LOST'].includes(body.status));
  assert.ok(body.prize && typeof body.prize.name === 'string');
});

test('회원 토큰으로 참여 시 개인정보 입력 없이 동의만으로 신청이 성립한다(도메인 7절)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${member.accessToken}` },
    body: JSON.stringify({ consent: true }),
  });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.userId, member.userId);
  assert.strictEqual(body.guestEmail, null);
  assert.strictEqual(body.status, 'APPLIED');
});

test('미동의 요청이 CONSENT_REQUIRED로 거부되고 레코드가 생성되지 않는다(S-2)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody({ consent: false })),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'CONSENT_REQUIRED');

  const count = await pool.query('SELECT count(*) FROM entries WHERE event_id = $1', [event.id]);
  assert.strictEqual(Number(count.rows[0].count), 0);
});

test('회원 전용 이벤트에 비로그인 참여 시 TARGET_TYPE_MISMATCH로 거부된다(S-3)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { targetType: 'MEMBER_ONLY', participationType: 'SIMPLE' });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody()),
  });
  assert.strictEqual(res.status, 403);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'TARGET_TYPE_MISMATCH');
});

test('비회원 전용 이벤트에 회원 토큰으로 참여 시도 시 TARGET_TYPE_MISMATCH로 거부된다(S-3)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { targetType: 'GUEST_ONLY', participationType: 'SIMPLE' });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${member.accessToken}` },
    body: JSON.stringify({ consent: true }),
  });
  assert.strictEqual(res.status, 403);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'TARGET_TYPE_MISMATCH');
});

test('같은 이메일로 같은 이벤트에 재참여 시 DUPLICATE_ENTRY로 거부되고 룰렛이 다시 돌지 않는다(S-4, S-5)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'ROULETTE', prizes: ROULETTE_PRIZES });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const body = guestBody();
  const firstRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.strictEqual(firstRes.status, 201);
  const first = await firstRes.json();

  const secondRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.strictEqual(secondRes.status, 409);
  const secondBody = await secondRes.json();
  assert.strictEqual(secondBody.error.code, 'DUPLICATE_ENTRY');

  const rows = await pool.query('SELECT prize_id FROM entries WHERE event_id = $1 AND guest_email = $2', [
    event.id,
    body.guestEmail.trim().toLowerCase(),
  ]);
  assert.strictEqual(rows.rowCount, 1);
  assert.strictEqual(rows.rows[0].prize_id, first.prizeId);
});

test('CANCELED 상태 레코드가 있는 참여자의 재신청은 새 레코드 없이 APPLIED로 되돌아간다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const body = guestBody();
  const firstRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const first = await firstRes.json();

  await pool.query("UPDATE entries SET status = 'CANCELED' WHERE id = $1", [first.id]);

  const reapplyRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.strictEqual(reapplyRes.status, 201);
  const reapplied = await reapplyRes.json();
  assert.strictEqual(reapplied.id, first.id);
  assert.strictEqual(reapplied.status, 'APPLIED');

  const count = await pool.query('SELECT count(*) FROM entries WHERE event_id = $1 AND guest_email = $2', [
    event.id,
    body.guestEmail.trim().toLowerCase(),
  ]);
  assert.strictEqual(Number(count.rows[0].count), 1);
});

test('CANCELED 레코드에 동시 재신청 2건이 와도 룰렛이 한 번만 돌고 1건만 성공한다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'ROULETTE', prizes: ROULETTE_PRIZES });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const body = guestBody();
  const firstRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const first = await firstRes.json();
  await pool.query("UPDATE entries SET status = 'CANCELED', prize_id = NULL WHERE id = $1", [first.id]);

  const [res1, res2] = await Promise.all([
    fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  ]);
  const statuses = [res1.status, res2.status].sort();
  assert.deepStrictEqual(statuses, [201, 409]);

  const rows = await pool.query('SELECT status, prize_id FROM entries WHERE id = $1', [first.id]);
  assert.strictEqual(rows.rowCount, 1);
  assert.ok(['WON', 'LOST'].includes(rows.rows[0].status));
  assert.ok(rows.rows[0].prize_id);
});

test('비회원 참여 시 guestEmail 형식이 올바르지 않으면 VALIDATION_ERROR로 거부된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody({ guestEmail: 'not-an-email' })),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
});

test('종료된 이벤트 참여 요청이 EVENT_CLOSED로 거부된다(S-9)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, {
    participationType: 'SIMPLE',
    startAt: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
    endAt: new Date(Date.now() - HOUR_MS).toISOString(),
  });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody()),
  });
  assert.strictEqual(res.status, 409);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'EVENT_CLOSED');
});

test('참여 버튼 연타(동시 2회 요청)에도 레코드가 1건만 생기고 추첨이 2회 일어나지 않는다(S-5)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'ROULETTE', prizes: ROULETTE_PRIZES });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const body = guestBody();
  const [res1, res2] = await Promise.all([
    fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  ]);
  const statuses = [res1.status, res2.status].sort();
  assert.deepStrictEqual(statuses, [201, 409]);

  const count = await pool.query('SELECT count(*) FROM entries WHERE event_id = $1 AND guest_email = $2', [
    event.id,
    body.guestEmail.trim().toLowerCase(),
  ]);
  assert.strictEqual(Number(count.rows[0].count), 1);
});
