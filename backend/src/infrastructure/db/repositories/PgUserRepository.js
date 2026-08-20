const UserRepository = require('../../../application/ports/UserRepository');
const User = require('../../../domain/entities/User');
const { mapRow } = require('../rowMapper');

class PgUserRepository extends UserRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findByEmail(email) {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? new User(mapRow(result.rows[0])) : null;
  }

  async findById(id) {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? new User(mapRow(result.rows[0])) : null;
  }

  async createMember({ email, passwordHash, companyName, name, phone }) {
    const result = await this.pool.query(
      `INSERT INTO users (role, email, password_hash, company_name, name, phone)
       VALUES ('MEMBER', $1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING *`,
      [email, passwordHash, companyName, name, phone]
    );
    return result.rows[0] ? new User(mapRow(result.rows[0])) : null;
  }

  async updateProfile(id, { companyName, name, phone }) {
    const result = await this.pool.query(
      `UPDATE users SET company_name = $2, name = $3, phone = $4 WHERE id = $1 RETURNING *`,
      [id, companyName, name, phone]
    );
    return result.rows[0] ? new User(mapRow(result.rows[0])) : null;
  }

  async updatePasswordHash(id, passwordHash) {
    await this.pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
  }
}

module.exports = PgUserRepository;
