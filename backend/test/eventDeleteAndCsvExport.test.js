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
    title: `BE-12 테스트 이벤트 ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
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
  const email = `be12-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
  return {
    consent: true,
    guestEmail: email,
    guestPhone: '010-1234-5678',
    guestInfo: { companyName: '테스트업체', name: '홍길동', phone: '010-1234-5678' },
    ...overrides,
  };
}

async function createGuestEntry(port, eventId, overrides) {
  const res = await fetch(`http://localhost:${port}/api/events/${eventId}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody(overrides)),
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`참여신청 생성 실패: ${JSON.stringify(body)}`);
  return body;
}

function deleteEvent(port, eventId, token = adminToken()) {
  return fetch(`http://localhost:${port}/api/events/${eventId}`, {
    method: 'DELETE',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function exportCsv(port, eventId, token = adminToken()) {
  return fetch(`http://localhost:${port}/api/events/${eventId}/entries/export`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

test('참여신청이 없는 이벤트는 관리자가 삭제할 수 있다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await deleteEvent(port, event.id);
  assert.strictEqual(res.status, 204);

  const getRes = await fetch(`http://localhost:${port}/api/events/${event.id}`);
  assert.strictEqual(getRes.status, 404);
});

test('일반 회원 토큰으로는 이벤트를 삭제할 수 없다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await deleteEvent(port, event.id, memberToken());
  assert.strictEqual(res.status, 403);
});

test('존재하지 않는 이벤트를 삭제하려 하면 404가 반환된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  t.after(() => server.close());

  const res = await deleteEvent(port, '00000000-0000-0000-0000-000000000000');
  assert.strictEqual(res.status, 404);
});

test('참여신청이 있는 이벤트를 삭제하려 하면 DB 제약에 의해 거부되고 기존 공통 에러 포맷을 사용한다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  await createGuestEntry(port, event.id);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await deleteEvent(port, event.id);
  assert.strictEqual(res.status, 409);
  const body = await res.json();
  assert.ok(body.error && body.error.code);

  const getRes = await fetch(`http://localhost:${port}/api/events/${event.id}`);
  assert.strictEqual(getRes.status, 200);
});

test('참여신청 목록을 CSV로 다운로드하면 BE-6 목록과 동일한 항목이 포함된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  const entry = await createGuestEntry(port, event.id, {
    guestInfo: { companyName: '한글업체명', name: '김담당', phone: '010-9999-9999' },
  });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await exportCsv(port, event.id);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);

  const buffer = Buffer.from(await res.arrayBuffer());
  const text = buffer.toString('utf8');

  assert.strictEqual(buffer[0], 0xef);
  assert.strictEqual(buffer[1], 0xbb);
  assert.strictEqual(buffer[2], 0xbf);

  const lines = text.replace(/^﻿/, '').split('\r\n');
  assert.strictEqual(lines[0], '구분,업체명,담당자,이메일,동의시각,경품,상태');
  assert.strictEqual(lines.length, 2);
  assert.ok(lines[1].includes('비회원'));
  assert.ok(lines[1].includes('한글업체명'));
  assert.ok(lines[1].includes('김담당'));
  assert.ok(lines[1].includes(entry.guestEmail));
  assert.ok(lines[1].includes('APPLIED'));
});

test('일반 회원 토큰으로는 CSV를 다운로드할 수 없다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await exportCsv(port, event.id, memberToken());
  assert.strictEqual(res.status, 403);
});

test('참여신청이 0건이면 헤더만 있는 CSV가 반환된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const event = await createEvent(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  const res = await exportCsv(port, event.id);
  assert.strictEqual(res.status, 200);
  const text = (await res.text()).replace(/^﻿/, '');
  assert.strictEqual(text, '구분,업체명,담당자,이메일,동의시각,경품,상태');
});
