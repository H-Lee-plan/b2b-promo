const pool = require('../pool');

async function create({ userId, tokenHash, expiresAt }) {
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

async function deleteByTokenHash(tokenHash) {
  const result = await pool.query(
    'DELETE FROM refresh_tokens WHERE token_hash = $1 RETURNING user_id',
    [tokenHash]
  );
  return result.rows[0] ? result.rows[0].user_id : null;
}

module.exports = { create, deleteByTokenHash };
