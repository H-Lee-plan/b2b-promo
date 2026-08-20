const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const pool = require('../src/infrastructure/db/pool');
const { loadEnv } = require('../src/infrastructure/config/env');

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

async function deleteEvent(id) {
  if (id) await pool.query('DELETE FROM events WHERE id = $1', [id]);
}

const HOUR_MS = 60 * 60 * 1000;

function baseEventBody(overrides = {}) {
  return {
    title: `BE-4 테스트 이벤트 ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    targetType: 'COMMON',
    participationType: 'SIMPLE',
    startAt: new Date(Date.now() + HOUR_MS).toISOString(),
    endAt: new Date(Date.now() + 2 * HOUR_MS).toISOString(),
    isPinned: false,
    ...overrides,
  };
}

test('관리자 토큰으로 룰렛 이벤트를 경품 3건과 함께 등록할 수 있다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  let eventId;
  t.after(async () => {
    server.close();
    await deleteEvent(eventId);
  });

  const res = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(
      baseEventBody({
        participationType: 'ROULETTE',
        prizes: [
          { name: '1등', weight: 1 },
          { name: '2등', weight: 5 },
          { name: '미당첨', weight: 94 },
        ],
      })
    ),
  });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  eventId = body.id;
  assert.strictEqual(body.prizes.length, 3);
});

test('경품 0건인 룰렛 이벤트는 등록되지 않는다(진행중 전환 자체가 불가능해짐)', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(baseEventBody({ participationType: 'ROULETTE', prizes: [] })),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
});

test('weight에 0 또는 음수를 넣으면 VALIDATION_ERROR로 거부된다', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(
      baseEventBody({ participationType: 'ROULETTE', prizes: [{ name: '1등', weight: 0 }] })
    ),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
});

test('목록 조회 결과가 상단노출 → 마감임박순 → 동률 시 등록순으로 정렬된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const ids = [];
  t.after(async () => {
    server.close();
    for (const id of ids) await deleteEvent(id);
  });

  async function create(overrides) {
    const res = await fetch(`http://localhost:${port}/api/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
      body: JSON.stringify(baseEventBody(overrides)),
    });
    const body = await res.json();
    ids.push(body.id);
    return body;
  }

  const marker = `SORT-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const far = await create({ title: `${marker}-far`, endAt: new Date(Date.now() + 10 * HOUR_MS).toISOString() });
  const near = await create({ title: `${marker}-near`, endAt: new Date(Date.now() + 3 * HOUR_MS).toISOString() });
  const pinned = await create({
    title: `${marker}-pinned`,
    isPinned: true,
    endAt: new Date(Date.now() + 20 * HOUR_MS).toISOString(),
  });

  const res = await fetch(`http://localhost:${port}/api/events`);
  assert.strictEqual(res.status, 200);
  const all = await res.json();
  const ordered = all.filter((e) => e.title.startsWith(marker)).map((e) => e.id);
  assert.deepStrictEqual(ordered, [pinned.id, near.id, far.id]);
});

test('endAt이 지난 이벤트가 DB 컬럼값과 무관하게 CLOSED로 조회된다(lazy 계산)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  let eventId;
  t.after(async () => {
    server.close();
    await deleteEvent(eventId);
  });

  const res = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(
      baseEventBody({
        startAt: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
        endAt: new Date(Date.now() - HOUR_MS).toISOString(),
      })
    ),
  });
  assert.strictEqual(res.status, 201);
  const created = await res.json();
  eventId = created.id;
  assert.strictEqual(created.status, 'CLOSED');

  const dbRow = await pool.query('SELECT status FROM events WHERE id = $1', [eventId]);
  assert.strictEqual(dbRow.rows[0].status, 'SCHEDULED');

  const getRes = await fetch(`http://localhost:${port}/api/events/${eventId}`);
  const getBody = await getRes.json();
  assert.strictEqual(getBody.status, 'CLOSED');
});

test('진행중 이벤트의 targetType/participationType/startAt 수정 요청이 거부된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  let eventId;
  t.after(async () => {
    server.close();
    await deleteEvent(eventId);
  });

  const createRes = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(
      baseEventBody({
        startAt: new Date(Date.now() - HOUR_MS).toISOString(),
        endAt: new Date(Date.now() + HOUR_MS).toISOString(),
      })
    ),
  });
  const created = await createRes.json();
  eventId = created.id;
  assert.strictEqual(created.status, 'ONGOING');

  const res = await fetch(`http://localhost:${port}/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify({ targetType: 'MEMBER_ONLY' }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
});

test('진행중인 룰렛 이벤트의 경품 목록 수정 요청은 거부된다(확정된 참여신청의 prizeId 보호)', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  let eventId;
  t.after(async () => {
    server.close();
    await deleteEvent(eventId);
  });

  const createRes = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(
      baseEventBody({
        participationType: 'ROULETTE',
        prizes: [{ name: '1등', weight: 1 }],
        startAt: new Date(Date.now() - HOUR_MS).toISOString(),
        endAt: new Date(Date.now() + HOUR_MS).toISOString(),
      })
    ),
  });
  const created = await createRes.json();
  eventId = created.id;
  assert.strictEqual(created.status, 'ONGOING');

  const res = await fetch(`http://localhost:${port}/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify({ prizes: [{ name: '1등', weight: 2 }] }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');

  const prizesAfter = await pool.query('SELECT id, weight FROM prizes WHERE event_id = $1', [eventId]);
  assert.strictEqual(prizesAfter.rows[0].weight, 1);
});

test('진행중 이벤트의 endAt을 앞당기는 요청은 거부되고, 연장은 허용된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  let eventId;
  t.after(async () => {
    server.close();
    await deleteEvent(eventId);
  });

  const createRes = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(
      baseEventBody({
        startAt: new Date(Date.now() - HOUR_MS).toISOString(),
        endAt: new Date(Date.now() + HOUR_MS).toISOString(),
      })
    ),
  });
  const created = await createRes.json();
  eventId = created.id;

  const shortenRes = await fetch(`http://localhost:${port}/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify({ endAt: new Date(Date.now() + 10 * 1000).toISOString() }),
  });
  assert.strictEqual(shortenRes.status, 400);

  const extendRes = await fetch(`http://localhost:${port}/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify({ endAt: new Date(Date.now() + 3 * HOUR_MS).toISOString() }),
  });
  assert.strictEqual(extendRes.status, 200);
});

test('종료 처리 후 상태가 CLOSED가 되고 되돌리는 API가 존재하지 않는다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  let eventId;
  t.after(async () => {
    server.close();
    await deleteEvent(eventId);
  });

  const createRes = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(
      baseEventBody({
        startAt: new Date(Date.now() - HOUR_MS).toISOString(),
        endAt: new Date(Date.now() + HOUR_MS).toISOString(),
      })
    ),
  });
  const created = await createRes.json();
  eventId = created.id;

  const closeRes = await fetch(`http://localhost:${port}/api/events/${eventId}/close`, {
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken()}` },
  });
  assert.strictEqual(closeRes.status, 200);
  const closed = await closeRes.json();
  assert.strictEqual(closed.status, 'CLOSED');

  const reCloseRes = await fetch(`http://localhost:${port}/api/events/${eventId}/close`, {
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken()}` },
  });
  assert.strictEqual(reCloseRes.status, 400);
});

test('일반 회원 토큰으로 이벤트 등록/종료를 시도하면 거부된다', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  t.after(() => server.close());

  const createRes = await fetch(`http://localhost:${port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${memberToken()}` },
    body: JSON.stringify(baseEventBody()),
  });
  assert.strictEqual(createRes.status, 403);

  const closeRes = await fetch(`http://localhost:${port}/api/events/00000000-0000-0000-0000-000000000000/close`, {
    method: 'POST',
    headers: { authorization: `Bearer ${memberToken()}` },
  });
  assert.strictEqual(closeRes.status, 403);
});
