const test = require('node:test');
const assert = require('node:assert');

const app = require('../src/server');

test('GET /health는 200과 { status: "ok" }를 반환한다', async () => {
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body, { status: 'ok' });
  } finally {
    server.close();
  }
});
