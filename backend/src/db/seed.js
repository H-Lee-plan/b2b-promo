require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  const client = new Client({ connectionString: process.env.DB_CONN_STRING });
  await client.connect();

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO users (role, email, password_hash, company_name, name, phone)
       VALUES ('ADMIN', $1, $2, '온리원이벤트', '관리자', '000-0000-0000')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, passwordHash]
    );

    if (result.rowCount === 0) {
      console.log(`이미 존재하는 관리자 계정입니다: ${email} (건너뜀)`);
    } else {
      console.log(`관리자 계정 생성 완료: ${email} (id=${result.rows[0].id})`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('시딩 실패:', err.message);
  process.exit(1);
});
