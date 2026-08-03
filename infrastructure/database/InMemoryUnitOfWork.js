'use strict';

/**
 * @typedef {import('../../application/ports/IUnitOfWork').IUnitOfWork} IUnitOfWork
 */

/**
 * InMemoryUnitOfWork — a driven adapter for IUnitOfWork used in
 * development/test wiring, where "storage" is the Maps inside in-memory
 * repositories (see InMemoryInventoryRepository). There is no real
 * transactional engine to delegate to, so this adapter provides genuine
 * atomicity itself: `begin()` snapshots every registered store's
 * key -> aggregate bindings, `commit()` discards the snapshot, and
 * `rollback()` restores every store to exactly what it held at `begin()`.
 *
 * This only works because the repositories it backs hand out *copies* of
 * their aggregates on read (see InMemoryInventoryRepository) — a caller
 * mutating what it read never touches the stored version until it
 * explicitly calls `save()`, so a snapshot taken at `begin()` is a true
 * "storage as of transaction start", not a set of references the
 * transaction is about to mutate out from under it.
 *
 * @implements {IUnitOfWork}
 */
class InMemoryUnitOfWork {
  /**
   * @param {Map<unknown, unknown>[]} stores the in-memory Maps to
   *   snapshot at `begin()` and restore on `rollback()`
   */
  constructor(stores) {
    this.stores = stores;
    /** @type {Map<unknown, unknown>[]|null} */
    this._snapshots = null;
  }

  async begin() {
    this._snapshots = this.stores.map((store) => new Map(store));
  }

  async commit() {
    this._snapshots = null;
  }

  async rollback() {
    if (!this._snapshots) return;

    this.stores.forEach((store, index) => {
      store.clear();
      for (const [key, value] of this._snapshots[index]) {
        store.set(key, value);
      }
    });
    this._snapshots = null;
  }
}

module.exports = { InMemoryUnitOfWork };
