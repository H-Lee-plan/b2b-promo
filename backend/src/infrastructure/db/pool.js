const { Pool } = require('pg');
const { loadEnv } = require('../config/env');

const env = loadEnv();
const pool = new Pool({ connectionString: env.DB_CONN_STRING });

pool.on('error', (err) => {
  console.error('[db] 예기치 않은 idle client 에러:', err.message);
});

module.exports = pool;
