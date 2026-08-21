require('./infrastructure/config/env').loadEnv();

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../../docs/swagger.json');

const requestLogger = require('./interfaces/http/middleware/requestLogger');
const errorHandler = require('./interfaces/http/middleware/errorHandler');
const { buildContainer } = require('./composition/container');
const { createAuthRoutes } = require('./interfaces/http/routes/authRoutes');
const { createEventsRoutes } = require('./interfaces/http/routes/eventsRoutes');
const { createEntriesRoutes } = require('./interfaces/http/routes/entriesRoutes');
const { createMypageRoutes } = require('./interfaces/http/routes/mypageRoutes');

const container = buildContainer();

const app = express();
app.use(express.json());
app.use(requestLogger);

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: FRONTEND_ORIGIN }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'production') {
  const devPort = process.env.PORT || 3000;
  const devSwaggerDocument = {
    ...swaggerDocument,
    servers: [{ url: `http://localhost:${devPort}/api`, description: '로컬 개발 서버' }],
  };
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(devSwaggerDocument));
}

const entriesRouter = createEntriesRoutes(container.entriesController, container.authMiddleware);

app.use('/api/auth', createAuthRoutes(container.authController));
app.use('/api/events', createEventsRoutes(container.eventsController, entriesRouter, container.authMiddleware));
app.use('/api/mypage', createMypageRoutes(container.mypageController, container.authMiddleware));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

/* node:coverage ignore next 5 */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`서버 시작: http://localhost:${PORT}`);
  });
}

module.exports = app;
