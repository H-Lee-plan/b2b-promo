const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const pool = require('../src/infrastructure/db/pool');
const { loadEnv } = require('../src/infrastructure/config/env');

const HOUR_MS = 60 * 60 * 1000;

async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
}

function adminToken() {
  const env = loadEnv();
  return jwt.sign({ userId: 'test-admin', role: 'ADMIN' }, env.JWT_SECRET, { expiresIn: '1h' });
}

function memberToken() {
  const env = loadEnv();
  return jwt.sign({ userId: 'test-member', role: 'MEMBER' }, env.JWT_SECRET, { expiresIn: '1h' });
}

function baseEventBody(overrides = {}) {
  return {
    title: `BE-6 테스트 이벤트 ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
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
  const email = `be6-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
  return {
    consent: true,
    guestEmail: email,
    guestPhone: '010-1234-5678',
    guestInfo: { companyName: '테스트업체', name: '홍길동', phone: '010-1234-5678' },
    ...overrides,
  };
}

async function signupAndLoginMember(port) {
  const email = `be6-member-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
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

test('관리자 토큰으로 이벤트별 참여신청 목록을 조회할 수 있고, 회원/비회원 건이 구분되어 나온다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const guest = guestBody();
  await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guest),
  });
  await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${member.accessToken}` },
    body: JSON.stringify({ consent: true }),
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    headers: { authorization: `Bearer ${adminToken()}` },
  });
  assert.strictEqual(res.status, 200);
  const list = await res.json();
  assert.strictEqual(list.length, 2);

  const guestEntry = list.find((e) => e.guestEmail === guest.guestEmail.trim().toLowerCase());
  const memberEntry = list.find((e) => e.userId === member.userId);
  assert.ok(guestEntry);
  assert.ok(memberEntry);
  assert.strictEqual(guestEntry.user, null);
  assert.strictEqual(memberEntry.user.id, member.userId);
  assert.strictEqual(memberEntry.guestEmail, null);
});

test('각 행에 동의 시각과 확정 경품(룰렛형)이 포함된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'ROULETTE', prizes: ROULETTE_PRIZES });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const guest = guestBody();
  const entryRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guest),
  });
  const created = await entryRes.json();

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    headers: { authorization: `Bearer ${adminToken()}` },
  });
  const list = await res.json();
  assert.strictEqual(list.length, 1);
  assert.ok(list[0].consentedAt);
  assert.ok(list[0].prize && list[0].prize.name === created.prize.name);
});

test('참여신청이 0건인 이벤트 조회 시 에러가 아니라 빈 결과가 반환된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    headers: { authorization: `Bearer ${adminToken()}` },
  });
  assert.strictEqual(res.status, 200);
  const list = await res.json();
  assert.deepStrictEqual(list, []);
});

test('일반 회원 토큰으로 조회 시 거부된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    headers: { authorization: `Bearer ${memberToken()}` },
  });
  assert.strictEqual(res.status, 403);
});

test('이벤트 종료 후 조회 시 건수가 더 이상 증가하지 않는다(S-9)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody()),
  });

  await fetch(`http://localhost:${port}/api/events/${event.id}/close`, {
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken()}` },
  });

  const rejectedRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody()),
  });
  assert.strictEqual(rejectedRes.status, 409);

  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    headers: { authorization: `Bearer ${adminToken()}` },
  });
  const list = await res.json();
  assert.strictEqual(list.length, 1);
});
