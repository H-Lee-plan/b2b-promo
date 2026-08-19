require('./config/env').loadEnv();

const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());
app.use(requestLogger);

if (process.env.NODE_ENV !== 'production') {
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  app.use(cors({ origin: FRONTEND_ORIGIN }));
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

/* node:coverage ignore next 5 */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`서버 시작: http://localhost:${PORT}`);
  });
}

module.exports = app;
