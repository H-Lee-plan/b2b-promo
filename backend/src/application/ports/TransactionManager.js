class TransactionManager {
  /** fn(tx) => Promise, tx는 각 리포지토리 메서드의 마지막 인자로 전달되는 트랜잭션 핸들 */
  runInTransaction(_fn) {
    throw new Error('Not implemented');
  }
}

module.exports = TransactionManager;
