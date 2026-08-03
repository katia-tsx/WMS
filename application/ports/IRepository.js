'use strict';

const { Port } = require('./Port');

/**
 * IRepository<T> — the generic outbound port for persisting and
 * retrieving aggregates of type T. Bounded contexts narrow it by
 * extending it with context-specific lookups (e.g.
 * `class InventoryRepositoryPort extends IRepository { findBySku(sku) {} }`)
 * rather than depending on this generic shape directly — Interface
 * Segregation still holds because a use case only ever sees the methods
 * its own narrowed port declares.
 *
 * @template T
 * @interface
 */
class IRepository extends Port {
  /**
   * Find a single aggregate by its identity.
   *
   * Pre:  `id` is a non-null identity value.
   * Post: resolves to the aggregate if one is stored under that id, or
   *       `null` otherwise. Never rejects for "not found" — that is an
   *       expected outcome, not an error.
   *
   * @param {string|number} id
   * @returns {Promise<T|null>}
   */
  async findById(id) {
    this._abstract('findById');
  }

  /**
   * Retrieve every stored aggregate of this type.
   *
   * Pre:  none.
   * Post: resolves to an array, possibly empty, never null/undefined.
   *
   * @returns {Promise<T[]>}
   */
  async findAll() {
    this._abstract('findAll');
  }

  /**
   * Persist an aggregate: insert it if its id is new, or overwrite the
   * stored version if it already exists (upsert semantics).
   *
   * Pre:  `entity` has already had its own invariants enforced (by its
   *       constructor/behavior methods) — this port never validates
   *       business rules, only stores.
   * Post: the aggregate is durably stored under its identity; a
   *       subsequent `findById(entity.id)` resolves to an equivalent
   *       aggregate.
   *
   * @param {T} entity
   * @returns {Promise<void>}
   */
  async save(entity) {
    this._abstract('save');
  }

  /**
   * Remove the aggregate stored under the given identity, if any.
   *
   * Pre:  `id` is a non-null identity value.
   * Post: a subsequent `findById(id)` resolves to `null`. Deleting an id
   *       that was never stored is a no-op, not an error.
   *
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    this._abstract('delete');
  }

  /**
   * Find every stored aggregate satisfying a composable specification,
   * keeping the domain's query vocabulary (see `ISpecification`)
   * decoupled from however the adapter turns it into SQL, an index scan,
   * or an in-memory filter.
   *
   * Pre:  `specification` implements `isSatisfiedBy(candidate)`.
   * Post: resolves to the array of stored aggregates for which
   *       `specification.isSatisfiedBy(aggregate)` is true. Possibly
   *       empty, never null/undefined.
   *
   * @param {import('./ISpecification').ISpecification<T>} specification
   * @returns {Promise<T[]>}
   */
  async findBySpecification(specification) {
    this._abstract('findBySpecification');
  }
}

module.exports = { IRepository };
