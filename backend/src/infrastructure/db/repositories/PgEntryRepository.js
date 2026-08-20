const EntryRepository = require('../../../application/ports/EntryRepository');
const Entry = require('../../../domain/entities/Entry');
const Event = require('../../../domain/entities/Event');
const { mapRow } = require('../rowMapper');

function baseEntryFields(row) {
  return mapRow({
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    guest_email: row.guest_email,
    guest_phone: row.guest_phone,
    guest_info: row.guest_info,
    form_data: row.form_data,
    consented_at: row.consented_at,
    status: row.status,
    prize_id: row.prize_id,
    applied_at: row.applied_at,
    user_agent: row.user_agent,
    consent_note: row.consent_note,
  });
}

function mapEntryListRow(row) {
  const user = row.user_id
    ? {
        id: row.user_id,
        role: row.user_role,
        email: row.user_email,
        companyName: row.user_company_name,
        name: row.user_name,
        phone: row.user_phone,
      }
    : null;
  const prize = row.prize_id
    ? { id: row.prize_id, eventId: row.event_id, name: row.prize_name, weight: row.prize_weight }
    : null;
  return new Entry({ ...baseEntryFields(row), user, prize });
}

class PgEntryRepository extends EntryRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findByEventId(eventId, tx = this.pool) {
    const result = await tx.query(
      `SELECT
         en.*,
         u.role AS user_role, u.email AS user_email, u.company_name AS user_company_name,
         u.name AS user_name, u.phone AS user_phone,
         p.name AS prize_name, p.weight AS prize_weight
       FROM entries en
       LEFT JOIN users u ON u.id = en.user_id
       LEFT JOIN prizes p ON p.id = en.prize_id
       WHERE en.event_id = $1
       ORDER BY en.applied_at ASC`,
      [eventId]
    );
    return result.rows.map(mapEntryListRow);
  }

  async findByUserId(userId, tx = this.pool) {
    const result = await tx.query(
      `SELECT en.*, p.name AS prize_name, p.weight AS prize_weight
       FROM entries en
       LEFT JOIN prizes p ON p.id = en.prize_id
       WHERE en.user_id = $1
       ORDER BY en.applied_at ASC`,
      [userId]
    );
    return result.rows.map((row) => {
      const prize = row.prize_id
        ? { id: row.prize_id, eventId: row.event_id, name: row.prize_name, weight: row.prize_weight }
        : null;
      return new Entry({ ...baseEntryFields(row), prize });
    });
  }

  async findOwnEntryWithEvent(entryId, userId, tx = this.pool) {
    const result = await tx.query(
      `SELECT en.*, ev.participation_type AS event_participation_type, ev.status AS event_status,
              ev.start_at AS event_start_at, ev.end_at AS event_end_at
       FROM entries en
       JOIN events ev ON ev.id = en.event_id
       WHERE en.id = $1 AND en.user_id = $2`,
      [entryId, userId]
    );
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    const event = new Event(
      mapRow({
        participation_type: row.event_participation_type,
        status: row.event_status,
        start_at: row.event_start_at,
        end_at: row.event_end_at,
      })
    );
    return new Entry({ ...baseEntryFields(row), event });
  }

  async findExistingByMember(eventId, userId, tx = this.pool) {
    const result = await tx.query('SELECT * FROM entries WHERE event_id = $1 AND user_id = $2', [
      eventId,
      userId,
    ]);
    return result.rows[0] ? new Entry(baseEntryFields(result.rows[0])) : null;
  }

  async findExistingByGuestEmail(eventId, guestEmail, tx = this.pool) {
    const result = await tx.query('SELECT * FROM entries WHERE event_id = $1 AND guest_email = $2', [
      eventId,
      guestEmail,
    ]);
    return result.rows[0] ? new Entry(baseEntryFields(result.rows[0])) : null;
  }

  async insertMemberEntry({ eventId, userId, consentedAt, userAgent, formData }, tx = this.pool) {
    const result = await tx.query(
      `INSERT INTO entries (event_id, user_id, consented_at, user_agent, form_data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id, user_id) WHERE user_id IS NOT NULL DO NOTHING
       RETURNING *`,
      [eventId, userId, consentedAt, userAgent, formData]
    );
    return result.rows[0] ? new Entry(baseEntryFields(result.rows[0])) : null;
  }

  async insertGuestEntry(
    { eventId, guestEmail, guestPhone, guestInfo, formData, consentedAt, userAgent },
    tx = this.pool
  ) {
    const result = await tx.query(
      `INSERT INTO entries (event_id, guest_email, guest_phone, guest_info, form_data, consented_at, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (event_id, guest_email) WHERE guest_email IS NOT NULL DO NOTHING
       RETURNING *`,
      [eventId, guestEmail, guestPhone, guestInfo, formData, consentedAt, userAgent]
    );
    return result.rows[0] ? new Entry(baseEntryFields(result.rows[0])) : null;
  }

  async reapplyById(id, { consentedAt, guestPhone, guestInfo, formData }, tx = this.pool) {
    // WHERE status='CANCELED'로 조건부 갱신해, 동시에 들어온 두 재신청 요청 중 하나만
    // 실제로 전환되도록 한다(둘 다 무조건 통과시키면 룰렛이 두 번 돌 수 있음).
    const result = await tx.query(
      `UPDATE entries
       SET status = 'APPLIED', consented_at = $2, guest_phone = COALESCE($3, guest_phone), guest_info = COALESCE($4, guest_info), form_data = COALESCE($5, form_data)
       WHERE id = $1 AND status = 'CANCELED'
       RETURNING *`,
      [id, consentedAt, guestPhone ?? null, guestInfo ?? null, formData ?? null]
    );
    return result.rows[0] ? new Entry(baseEntryFields(result.rows[0])) : null;
  }

  async setRouletteResult(id, { prizeId, status }, tx = this.pool) {
    const result = await tx.query('UPDATE entries SET prize_id = $2, status = $3 WHERE id = $1 RETURNING *', [
      id,
      prizeId,
      status,
    ]);
    return new Entry(baseEntryFields(result.rows[0]));
  }

  async cancelById(id, tx = this.pool) {
    const result = await tx.query(
      `UPDATE entries SET status = 'CANCELED' WHERE id = $1 AND status = 'APPLIED' RETURNING *`,
      [id]
    );
    return result.rows[0] ? new Entry(baseEntryFields(result.rows[0])) : null;
  }

  async updateConsentNote(id, consentNote, tx = this.pool) {
    const result = await tx.query(
      'UPDATE entries SET consent_note = $2 WHERE id = $1 RETURNING *',
      [id, consentNote]
    );
    return result.rows[0] ? new Entry(baseEntryFields(result.rows[0])) : null;
  }
}

module.exports = PgEntryRepository;
