'use strict';

/**
 * @typedef {import('../../application/ports/IUnitOfWork').IUnitOfWork} IUnitOfWork
 */

/**
 * PostgresUnitOfWork — the production driven adapter for IUnitOfWork,
 * standing in for InMemoryUnitOfWork once real Postgres transactions
 * (BEGIN/COMMIT/ROLLBACK over a pooled client) exist. Deliberately
 * unimplemented for now, mirroring PostgresInventoryRepository: this
 * class lets infrastructure/di/CompositionRoot.js already switch to it
 * for the production configuration, exercising the dependency graph
 * end-to-end before real transaction handling is built.
 *
 * @implements {IUnitOfWork}
 */
class PostgresUnitOfWork {
  /** @param {{ connectionString: string }} config */
  constructor({ connectionString }) {
    if (!connectionString) {
      throw new Error('PostgresUnitOfWork requires a connectionString (e.g. from process.env.DATABASE_URL).');
    }
    this.connectionString = connectionString;
  }

  async begin() {
    throw new Error('PostgresUnitOfWork.begin is not yet implemented — wire in a real Postgres client here.');
  }

  async commit() {
    throw new Error('PostgresUnitOfWork.commit is not yet implemented — wire in a real Postgres client here.');
  }

  async rollback() {
    throw new Error('PostgresUnitOfWork.rollback is not yet implemented — wire in a real Postgres client here.');
  }
}

module.exports = { PostgresUnitOfWork };
