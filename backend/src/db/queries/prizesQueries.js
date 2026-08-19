const pool = require('../pool');
const { mapRows } = require('../rowMapper');

async function findByEventId(eventId, client = pool) {
  const result = await client.query('SELECT * FROM prizes WHERE event_id = $1 ORDER BY name', [eventId]);
  return mapRows(result.rows);
}

async function replaceForEvent(eventId, prizes, client = pool) {
  await client.query('DELETE FROM prizes WHERE event_id = $1', [eventId]);
  for (const prize of prizes) {
    await client.query('INSERT INTO prizes (event_id, name, weight) VALUES ($1, $2, $3)', [
      eventId,
      prize.name,
      prize.weight,
    ]);
  }
}

module.exports = { findByEventId, replaceForEvent };
