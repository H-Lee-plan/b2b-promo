const pool = require('../pool');
const { mapRow } = require('../rowMapper');

async function insert(
  { title, description, targetType, participationType, startAt, endAt, isPinned },
  client = pool
) {
  const result = await client.query(
    `INSERT INTO events (title, description, target_type, participation_type, start_at, end_at, is_pinned)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, description ?? null, targetType, participationType, startAt, endAt, isPinned]
  );
  return mapRow(result.rows[0]);
}

async function findAll(client = pool) {
  const result = await client.query('SELECT * FROM events ORDER BY is_pinned DESC, end_at ASC, created_at ASC');
  return result.rows.map(mapRow);
}

async function findById(id, client = pool) {
  const result = await client.query('SELECT * FROM events WHERE id = $1', [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function update(
  id,
  { title, description, targetType, participationType, startAt, endAt, isPinned },
  client = pool
) {
  const result = await client.query(
    `UPDATE events
     SET title = $2, description = $3, target_type = $4, participation_type = $5,
         start_at = $6, end_at = $7, is_pinned = $8
     WHERE id = $1
     RETURNING *`,
    [id, title, description ?? null, targetType, participationType, startAt, endAt, isPinned]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function close(id, client = pool) {
  const result = await client.query("UPDATE events SET status = 'CLOSED' WHERE id = $1 RETURNING *", [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

module.exports = { insert, findAll, findById, update, close };
