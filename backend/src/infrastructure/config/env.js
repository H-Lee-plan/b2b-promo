const REQUIRED_KEYS = ['DB_CONN_STRING', 'JWT_SECRET', 'ADMIN_SEED_EMAIL', 'ADMIN_SEED_PASSWORD'];

function validateEnv(source = process.env) {
  const missingKeys = REQUIRED_KEYS.filter((key) => !source[key]);
  if (missingKeys.length > 0) {
    return { ok: false, missingKeys };
  }
  const env = {};
  for (const key of REQUIRED_KEYS) env[key] = source[key];
  return { ok: true, env };
}

function loadEnv({ source = process.env, exit = process.exit, log = console.error } = {}) {
  require('dotenv').config();
  const result = validateEnv(source);
  if (!result.ok) {
    log(`[env] 필수 환경변수 누락: ${result.missingKeys.join(', ')}`);
    exit(1);
    return undefined;
  }
  return result.env;
}

module.exports = { validateEnv, loadEnv, REQUIRED_KEYS };
