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
    title: `BE-9 테스트 이벤트 ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
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
  return { res, body };
}

async function cleanupEvent(eventId) {
  if (!eventId) return;
  await pool.query('DELETE FROM entries WHERE event_id = $1', [eventId]);
  await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
}

function guestBody(overrides = {}) {
  const email = `be9-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
  return {
    consent: true,
    guestEmail: email,
    guestPhone: '010-1234-5678',
    guestInfo: { companyName: '테스트업체', name: '홍길동', phone: '010-1234-5678' },
    ...overrides,
  };
}

async function signupAndLoginMember(port) {
  const email = `be9-member-${Date.now()}-${Math.floor(Math.random() * 1e6)}@corp.com`;
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

const FORM_FIELDS = ['담당자명', '연락처'];

test('관리자가 FORM 이벤트를 필드 목록과 함께 등록할 수 있다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  let eventId;
  t.after(async () => {
    server.close();
    await cleanupEvent(eventId);
  });

  const { res, body } = await createEvent(port, {
    participationType: 'FORM',
    formFields: FORM_FIELDS,
  });
  eventId = body.id;
  assert.strictEqual(res.status, 201);
  assert.deepStrictEqual(body.formFields, FORM_FIELDS);
});

test('formFields 없이/빈 배열로 FORM 이벤트 등록 시 400 VALIDATION_ERROR', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  t.after(() => server.close());

  const noFieldsRes = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(baseEventBody({ participationType: 'FORM' })),
  });
  assert.strictEqual(noFieldsRes.status, 400);
  const noFieldsBody = await noFieldsRes.json();
  assert.strictEqual(noFieldsBody.error.code, 'VALIDATION_ERROR');

  const emptyFieldsRes = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(baseEventBody({ participationType: 'FORM', formFields: [] })),
  });
  assert.strictEqual(emptyFieldsRes.status, 400);
  const emptyFieldsBody = await emptyFieldsRes.json();
  assert.strictEqual(emptyFieldsBody.error.code, 'VALIDATION_ERROR');
});

test('정의된 필수 필드를 채우지 않고 참여 시 VALIDATION_ERROR로 거부된다(비회원)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const { body: event } = await createEvent(port, { participationType: 'FORM', formFields: FORM_FIELDS });
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
  });

  // 필드 하나 누락
  const missingRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody({ formData: { 담당자명: '홍길동' } })),
  });
  assert.strictEqual(missingRes.status, 400);
  const missingBody = await missingRes.json();
  assert.strictEqual(missingBody.error.code, 'VALIDATION_ERROR');

  // 필드 값이 빈 문자열
  const blankRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(guestBody({ formData: { 담당자명: '홍길동', 연락처: '' } })),
  });
  assert.strictEqual(blankRes.status, 400);
  const blankBody = await blankRes.json();
  assert.strictEqual(blankBody.error.code, 'VALIDATION_ERROR');

  const count = await pool.query('SELECT count(*) FROM entries WHERE event_id = $1', [event.id]);
  assert.strictEqual(Number(count.rows[0].count), 0);
});

test('정상 제출 시 formData가 참여신청에 저장되고 관리자 목록 조회에서도 동일하게 조회되며, 룰렛 관련 필드가 생기지 않는다(회원)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const { body: event } = await createEvent(port, { participationType: 'FORM', formFields: FORM_FIELDS });
  const member = await signupAndLoginMember(port);
  t.after(async () => {
    server.close();
    await cleanupEvent(event.id);
    await cleanupMember(member.email);
  });

  const formData = { 담당자명: '김철수', 연락처: '010-9999-8888' };
  const res = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${member.accessToken}` },
    body: JSON.stringify({ consent: true, formData }),
  });
  assert.strictEqual(res.status, 201);
  const created = await res.json();
  assert.deepStrictEqual(created.formData, formData);
  assert.strictEqual(created.status, 'APPLIED');
  assert.strictEqual(created.prizeId, null);
  assert.strictEqual(created.prize, null);

  const listRes = await fetch(`http://localhost:${port}/api/events/${event.id}/entries`, {
    headers: { authorization: `Bearer ${adminToken()}` },
  });
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  const found = list.find((e) => e.id === created.id);
  assert.ok(found, '생성한 참여신청이 목록에 존재해야 한다');
  assert.deepStrictEqual(found.formData, formData);
  assert.strictEqual(found.prizeId, null);
});

test('SIMPLE 이벤트는 formFields 없이도 정상 등록되고 응답의 formFields가 빈 배열이다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  let eventId;
  t.after(async () => {
    server.close();
    await cleanupEvent(eventId);
  });

  const { res, body } = await createEvent(port, { participationType: 'SIMPLE' });
  eventId = body.id;
  assert.strictEqual(res.status, 201);
  assert.deepStrictEqual(body.formFields, []);
});
