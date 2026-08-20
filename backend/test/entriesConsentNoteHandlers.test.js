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
    title: `BE-10 테스트 이벤트 ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
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
  const email = `be10-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
  return {
    consent: true,
    guestEmail: email,
    guestPhone: '010-1234-5678',
    guestInfo: { companyName: '테스트업체', name: '홍길동', phone: '010-1234-5678' },
    ...overrides,
  };
}

async function createEntry(port, eventId, overrides) {
  const res = await fetch(`http://localhost:${port}/api/events/${eventId}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody(overrides)),
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`참여신청 생성 실패: ${JSON.stringify(body)}`);
  return body;
}

function patchConsentNote(port, eventId, entryId, consentNote, token = adminToken()) {
  return fetch(`http://localhost:${port}/api/events/${eventId}/entries/${entryId}/consent-note`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ consentNote }),
  });
}

test('관리자가 참여신청 건에 메모를 작성하면 저장된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  const entry = await createEntry(port, event.id);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await patchConsentNote(port, event.id, entry.id, '전화 통화로 동의 확인함');
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.id, entry.id);
  assert.strictEqual(body.consentNote, '전화 통화로 동의 확인함');
});

test('같은 건에 재작성 시 값이 덮어써진다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  const entry = await createEntry(port, event.id);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  await patchConsentNote(port, event.id, entry.id, '첫 번째 메모');
  const res = await patchConsentNote(port, event.id, entry.id, '두 번째 메모');
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.consentNote, '두 번째 메모');
});

test('일반 회원 토큰으로는 메모를 작성할 수 없다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  const entry = await createEntry(port, event.id);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await patchConsentNote(port, event.id, entry.id, '회원 메모', memberToken());
  assert.strictEqual(res.status, 403);
});

test('인증 토큰 없이 요청하면 401이 반환된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  const entry = await createEntry(port, event.id);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await patchConsentNote(port, event.id, entry.id, '메모', null);
  assert.strictEqual(res.status, 401);
});

test('존재하지 않는 entryId로 요청하면 404가 반환된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await patchConsentNote(port, event.id, '00000000-0000-0000-0000-000000000000', '메모');
  assert.strictEqual(res.status, 404);
});

test('consentNote가 문자열이 아니면 400 VALIDATION_ERROR가 반환된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  const entry = await createEntry(port, event.id);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await patchConsentNote(port, event.id, entry.id, 12345);
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
});

test('메모를 작성하지 않은 참여신청도 consentedAt은 존재하고 consentNote는 null이다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const entry = await createEntry(port, event.id);
  assert.ok(entry.consentedAt);
  assert.strictEqual(entry.consentNote, null);
});
