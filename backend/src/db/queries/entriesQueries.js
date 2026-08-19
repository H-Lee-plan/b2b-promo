const pool = require('../pool');
const { mapRow } = require('../rowMapper');

async function findExistingByMember(eventId, userId, client = pool) {
  const result = await client.query('SELECT * FROM entries WHERE event_id = $1 AND user_id = $2', [
    eventId,
    userId,
  ]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function findExistingByGuestEmail(eventId, guestEmail, client = pool) {
  const result = await client.query('SELECT * FROM entries WHERE event_id = $1 AND guest_email = $2', [
    eventId,
    guestEmail,
  ]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function insertMemberEntry({ eventId, userId, consentedAt, userAgent }, client = pool) {
  const result = await client.query(
    `INSERT INTO entries (event_id, user_id, consented_at, user_agent)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (event_id, user_id) WHERE user_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [eventId, userId, consentedAt, userAgent]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function insertGuestEntry(
  { eventId, guestEmail, guestPhone, guestInfo, consentedAt, userAgent },
  client = pool
) {
  const result = await client.query(
    `INSERT INTO entries (event_id, guest_email, guest_phone, guest_info, consented_at, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id, guest_email) WHERE guest_email IS NOT NULL DO NOTHING
     RETURNING *`,
    [eventId, guestEmail, guestPhone, guestInfo, consentedAt, userAgent]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function reapplyById(id, { consentedAt, guestPhone, guestInfo }, client = pool) {
  // WHERE status='CANCELED'로 조건부 갱신해, 동시에 들어온 두 재신청 요청 중 하나만
  // 실제로 전환되도록 한다(둘 다 무조건 통과시키면 룰렛이 두 번 돌 수 있음).
  const result = await client.query(
    `UPDATE entries
     SET status = 'APPLIED', consented_at = $2, guest_phone = COALESCE($3, guest_phone), guest_info = COALESCE($4, guest_info)
     WHERE id = $1 AND status = 'CANCELED'
     RETURNING *`,
    [id, consentedAt, guestPhone ?? null, guestInfo ?? null]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function setRouletteResult(id, { prizeId, status }, client = pool) {
  const result = await client.query('UPDATE entries SET prize_id = $2, status = $3 WHERE id = $1 RETURNING *', [
    id,
    prizeId,
    status,
  ]);
  return mapRow(result.rows[0]);
}

module.exports = {
  findExistingByMember,
  findExistingByGuestEmail,
  insertMemberEntry,
  insertGuestEntry,
  reapplyById,
  setRouletteResult,
};
