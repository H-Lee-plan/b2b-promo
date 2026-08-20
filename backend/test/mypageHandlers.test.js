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

function baseEventBody(overrides = {}) {
  return {
    title: `BE-8 테스트 이벤트 ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
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

async function signupAndLoginMember(port) {
  const email = `be8-member-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
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

async function joinEvent(port, eventId, accessToken) {
  const res = await fetch(`http://localhost:${port}/api/events/${eventId}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ consent: true }),
  });
  return res.json();
}

const ROULETTE_PRIZES = [
  { name: '1등', weight: 1 },
  { name: '미당첨', weight: 1 },
];

test('회원이 본인 참여신청 목록을 조회하면 상태와 경품명이 함께 보인다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'ROULETTE', prizes: ROULETTE_PRIZES });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const created = await joinEvent(port, event.id, member.accessToken);

  const res = await fetch(`http://localhost:${port}/api/mypage/entries`, {
    headers: { authorization: `Bearer ${member.accessToken}` },
  });
  assert.strictEqual(res.status, 200);
  const list = await res.json();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].status, created.status);
  assert.strictEqual(list[0].prize.name, created.prize.name);
});

test('회원이 내 정보(업체명/이름/연락처)를 수정할 수 있다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupMember(member.email);
  });

  const res = await fetch(`http://localhost:${port}/api/mypage/profile`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${member.accessToken}` },
    body: JSON.stringify({ companyName: '새업체', name: '새이름', phone: '010-9999-8888' }),
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.companyName, '새업체');
  assert.strictEqual(body.name, '새이름');
  assert.strictEqual(body.phone, '010-9999-8888');
});

test('현재 비밀번호가 틀리면 비밀번호 변경이 거부된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupMember(member.email);
  });

  const res = await fetch(`http://localhost:${port}/api/mypage/password`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${member.accessToken}` },
    body: JSON.stringify({ currentPassword: 'wrong-password', newPassword: 'newpassword123' }),
  });
  assert.strictEqual(res.status, 401);

  const loginRes = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: member.email, password: 'password123' }),
  });
  assert.strictEqual(loginRes.status, 200);
});

test('진행중 단순 참여형 신청을 취소하면 상태가 CANCELED로 바뀐다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const created = await joinEvent(port, event.id, member.accessToken);

  const res = await fetch(`http://localhost:${port}/api/mypage/entries/${created.id}/cancel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${member.accessToken}` },
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'CANCELED');
});

test('룰렛 게임형 신청에 대한 취소 요청은 항상 거부된다(도메인 6절, S-7)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'ROULETTE', prizes: ROULETTE_PRIZES });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const created = await joinEvent(port, event.id, member.accessToken);

  const res = await fetch(`http://localhost:${port}/api/mypage/entries/${created.id}/cancel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${member.accessToken}` },
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');

  const row = await pool.query('SELECT status FROM entries WHERE id = $1', [created.id]);
  assert.notStrictEqual(row.rows[0].status, 'CANCELED');
});

test('취소 후 재신청 시 새 레코드가 아니라 기존 레코드가 APPLIED로 전환된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const created = await joinEvent(port, event.id, member.accessToken);
  await fetch(`http://localhost:${port}/api/mypage/entries/${created.id}/cancel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${member.accessToken}` },
  });

  const reapplied = await joinEvent(port, event.id, member.accessToken);
  assert.strictEqual(reapplied.id, created.id);
  assert.strictEqual(reapplied.status, 'APPLIED');

  const count = await pool.query('SELECT count(*) FROM entries WHERE event_id = $1 AND user_id = $2', [
    event.id,
    member.userId,
  ]);
  assert.strictEqual(Number(count.rows[0].count), 1);
});

test('종료된 이벤트의 신청은 취소·재신청이 모두 거부된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const created = await joinEvent(port, event.id, member.accessToken);
  await fetch(`http://localhost:${port}/api/events/${event.id}/close`, {
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken()}` },
  });

  const cancelRes = await fetch(`http://localhost:${port}/api/mypage/entries/${created.id}/cancel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${member.accessToken}` },
  });
  assert.strictEqual(cancelRes.status, 409);
  const cancelBody = await cancelRes.json();
  assert.strictEqual(cancelBody.error.code, 'EVENT_CLOSED');

  const reapplyRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${member.accessToken}` },
    body: JSON.stringify({ consent: true }),
  });
  assert.strictEqual(reapplyRes.status, 409);
});

test('다른 회원의 참여신청을 조회·취소할 수 없다(본인 것만 접근 가능)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port, { participationType: 'SIMPLE' });
  const memberA = await signupAndLoginMember(port);
  const memberB = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(memberA.email);
    await cleanupMember(memberB.email);
  });

  const created = await joinEvent(port, event.id, memberA.accessToken);

  const listRes = await fetch(`http://localhost:${port}/api/mypage/entries`, {
    headers: { authorization: `Bearer ${memberB.accessToken}` },
  });
  const listBody = await listRes.json();
  assert.deepStrictEqual(listBody, []);

  const cancelRes = await fetch(`http://localhost:${port}/api/mypage/entries/${created.id}/cancel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${memberB.accessToken}` },
  });
  assert.strictEqual(cancelRes.status, 404);

  const row = await pool.query('SELECT status FROM entries WHERE id = $1', [created.id]);
  assert.strictEqual(row.rows[0].status, 'APPLIED');
});
