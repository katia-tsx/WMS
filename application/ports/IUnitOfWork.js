'use strict';

const { Port } = require('./Port');

/**
 * IUnitOfWork — abstracts an atomic transactional boundary around one or
 * more repository writes, so a use case can say "these writes succeed or
 * fail together" without knowing whether the adapter is a SQL transaction,
 * a document-store session, or (for an in-memory fake) a no-op.
 *
 * Usage is always begin -> repository calls -> commit, with rollback on
 * any thrown error:
 *
 *   await unitOfWork.begin();
 *   try {
 *     await repository.save(aggregate);
 *     await unitOfWork.commit();
 *   } catch (error) {
 *     await unitOfWork.rollback();
 *     throw error;
 *   }
 *
 * @interface
 */
class IUnitOfWork extends Port {
  /**
   * Pre:  no transaction opened by this unit of work is currently open.
   * Post: a transaction is open; writes made through repositories bound
   *       to it are staged but not yet durable until `commit()`.
   *
   * @returns {Promise<void>}
   */
  async begin() {
    this._abstract('begin');
  }

  /**
   * Pre:  a transaction opened by `begin()` is currently open.
   * Post: every write staged since `begin()` is made durable atomically
   *       and the transaction is closed. If any staged write is invalid,
   *       none of them are applied (all-or-nothing) and the returned
   *       promise rejects.
   *
   * @returns {Promise<void>}
   */
  async commit() {
    this._abstract('commit');
  }

  /**
   * Pre:  a transaction opened by `begin()` is currently open.
   * Post: every write staged since `begin()` is discarded, the
   *       transaction is closed, and storage is left exactly as it was
   *       immediately before `begin()`.
   *
   * @returns {Promise<void>}
   */
  async rollback() {
    this._abstract('rollback');
  }
}

module.exports = { IUnitOfWork };
