const TransactionManager = require('../../application/ports/TransactionManager');

class PgTransactionManager extends TransactionManager {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async runInTransaction(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = PgTransactionManager;
