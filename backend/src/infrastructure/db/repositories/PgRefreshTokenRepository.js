const RefreshTokenRepository = require('../../../application/ports/RefreshTokenRepository');

class PgRefreshTokenRepository extends RefreshTokenRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async create({ userId, tokenHash, expiresAt }) {
    await this.pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
  }

  async deleteByTokenHash(tokenHash) {
    const result = await this.pool.query(
      'DELETE FROM refresh_tokens WHERE token_hash = $1 RETURNING user_id',
      [tokenHash]
    );
    return result.rows[0] ? result.rows[0].user_id : null;
  }
}

module.exports = PgRefreshTokenRepository;
