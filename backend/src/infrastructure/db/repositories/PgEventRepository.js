const EventRepository = require('../../../application/ports/EventRepository');
const Event = require('../../../domain/entities/Event');
const { mapRow } = require('../rowMapper');
const { AppError } = require('../../../domain/errors/AppError');

class PgEventRepository extends EventRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async insert(
    { title, description, targetType, participationType, startAt, endAt, isPinned, formFields },
    tx = this.pool
  ) {
    const result = await tx.query(
      `INSERT INTO events (title, description, target_type, participation_type, start_at, end_at, is_pinned, form_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description ?? null,
        targetType,
        participationType,
        startAt,
        endAt,
        isPinned,
        formFields && formFields.length > 0 ? JSON.stringify(formFields) : null,
      ]
    );
    return new Event(mapRow(result.rows[0]));
  }

  async findAll(tx = this.pool) {
    const result = await tx.query('SELECT * FROM events ORDER BY is_pinned DESC, end_at ASC, created_at ASC');
    return result.rows.map((row) => new Event(mapRow(row)));
  }

  async findById(id, tx = this.pool) {
    const result = await tx.query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows[0] ? new Event(mapRow(result.rows[0])) : null;
  }

  async update(
    id,
    { title, description, targetType, participationType, startAt, endAt, isPinned, formFields },
    tx = this.pool
  ) {
    const result = await tx.query(
      `UPDATE events
       SET title = $2, description = $3, target_type = $4, participation_type = $5,
           start_at = $6, end_at = $7, is_pinned = $8, form_fields = $9
       WHERE id = $1
       RETURNING *`,
      [
        id,
        title,
        description ?? null,
        targetType,
        participationType,
        startAt,
        endAt,
        isPinned,
        formFields && formFields.length > 0 ? JSON.stringify(formFields) : null,
      ]
    );
    return result.rows[0] ? new Event(mapRow(result.rows[0])) : null;
  }

  async close(id, tx = this.pool) {
    const result = await tx.query("UPDATE events SET status = 'CLOSED' WHERE id = $1 RETURNING *", [id]);
    return result.rows[0] ? new Event(mapRow(result.rows[0])) : null;
  }

  async delete(id, tx = this.pool) {
    try {
      const result = await tx.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    } catch (err) {
      if (err.code === '23503') {
        throw new AppError('EVENT_HAS_ENTRIES', '참여신청이 있는 이벤트는 삭제할 수 없습니다.');
      }
      throw err;
    }
  }
}

module.exports = PgEventRepository;
