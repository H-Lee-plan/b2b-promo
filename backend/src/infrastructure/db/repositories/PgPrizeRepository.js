const PrizeRepository = require('../../../application/ports/PrizeRepository');
const { mapRows } = require('../rowMapper');

class PgPrizeRepository extends PrizeRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findByEventId(eventId, tx = this.pool) {
    const result = await tx.query('SELECT * FROM prizes WHERE event_id = $1 ORDER BY name', [eventId]);
    return mapRows(result.rows);
  }

  async replaceForEvent(eventId, prizes, tx = this.pool) {
    await tx.query('DELETE FROM prizes WHERE event_id = $1', [eventId]);
    for (const prize of prizes) {
      await tx.query('INSERT INTO prizes (event_id, name, weight) VALUES ($1, $2, $3)', [
        eventId,
        prize.name,
        prize.weight,
      ]);
    }
  }
}

module.exports = PgPrizeRepository;
