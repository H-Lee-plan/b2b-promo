const pool = require('../pool');
const { mapRow } = require('../rowMapper');

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function createMember({ email, passwordHash, companyName, name, phone }) {
  const result = await pool.query(
    `INSERT INTO users (role, email, password_hash, company_name, name, phone)
     VALUES ('MEMBER', $1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [email, passwordHash, companyName, name, phone]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

module.exports = { findByEmail, findById, createMember };
