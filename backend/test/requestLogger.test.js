const test = require('node:test');
const assert = require('node:assert');
const express = require('express');

const requestLogger = require('../src/middleware/requestLogger');

test('요청 1건당 "메서드 경로 상태코드 응답시간ms" 로그 1줄을 남기고 민감정보를 포함하지 않는다', async () => {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.post('/login', (req, res) => {
    res.status(200).json({ ok: true });
  });

  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);

  const server = app.listen(0);
  try {
    const port = server.address().port;
    await new Promise((resolve) => {
      server.on('listening', resolve);
      if (server.listening) resolve();
    });
    await fetch(`http://localhost:${port}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@corp.com', password: 'secret123' }),
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
  } finally {
    console.log = originalLog;
    server.close();
  }

  assert.strictEqual(logs.length, 1);
  assert.match(logs[0], /^POST \/login 200 \d+ms$/);
  assert.ok(!logs[0].includes('secret123'));
});
