const test = require('node:test');
const assert = require('node:assert');
const express = require('express');

const { createAuthMiddleware } = require('../src/interfaces/http/middleware/auth');
const errorHandler = require('../src/interfaces/http/middleware/errorHandler');
const JwtTokenService = require('../src/infrastructure/security/JwtTokenService');
const { loadEnv } = require('../src/infrastructure/config/env');

const env = loadEnv();
const tokenService = new JwtTokenService({
  secret: env.JWT_SECRET,
  accessExpiresIn: '1h',
  refreshExpiresIn: '14d',
});
const { requireAuth, requireRole } = createAuthMiddleware(tokenService);

function buildApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => res.status(200).json({ ok: true }));
  app.get('/admin-only', requireAuth, requireRole('ADMIN'), (req, res) => res.status(200).json({ ok: true }));
  app.use(errorHandler);
  return app;
}

async function startServer(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return server;
}

test('인증 필요 라우트에 토큰 없이 접근하면 401이다', async () => {
  const server = await startServer(buildApp());
  try {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/protected`);
    assert.strictEqual(res.status, 401);
  } finally {
    server.close();
  }
});

test("role='MEMBER' 토큰으로 관리자 전용 라우트 접근 시 거부된다", async () => {
  const server = await startServer(buildApp());
  try {
    const port = server.address().port;
    const { accessToken: memberToken } = tokenService.issueTokenPair({ id: 'test-user', role: 'MEMBER' });

    const res = await fetch(`http://localhost:${port}/admin-only`, {
      headers: { authorization: `Bearer ${memberToken}` },
    });
    assert.strictEqual(res.status, 403);

    const { accessToken: adminToken } = tokenService.issueTokenPair({ id: 'test-admin', role: 'ADMIN' });
    const adminRes = await fetch(`http://localhost:${port}/admin-only`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
  } finally {
    server.close();
  }
});
