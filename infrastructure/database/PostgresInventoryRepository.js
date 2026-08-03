'use strict';

/**
 * @typedef {import('../../application/ports/InventoryRepositoryPort').InventoryRepositoryPort} InventoryRepositoryPort
 */

/**
 * PostgresInventoryRepository — the production driven adapter for
 * InventoryRepositoryPort, standing in for InMemoryInventoryRepository
 * once a real Postgres-backed store exists. Query methods are
 * deliberately unimplemented for now: this class exists so
 * infrastructure/di/CompositionRoot.js can already switch to it by
 * environment, exercising the *dependency graph* end-to-end for the
 * production configuration (construction, injection into
 * AdjustStockUseCase, etc.) before the query layer itself is built. Swap
 * the method bodies for real queries against a "pg" client without
 * touching the port, any use case, or the composition root.
 *
 * @implements {InventoryRepositoryPort}
 */
class PostgresInventoryRepository {
  /** @param {{ connectionString: string }} config */
  constructor({ connectionString }) {
    if (!connectionString) {
      throw new Error('PostgresInventoryRepository requires a connectionString (e.g. from process.env.DATABASE_URL).');
    }
    this.connectionString = connectionString;
  }

  /** @param {string} sku */
  async findBySku(sku) {
    throw new Error('PostgresInventoryRepository.findBySku is not yet implemented — wire in a real Postgres client here.');
  }

  /** @param {import('../../domain/inventory/entities/Product').Product} product */
  async save(product) {
    throw new Error('PostgresInventoryRepository.save is not yet implemented — wire in a real Postgres client here.');
  }

  async findAll() {
    throw new Error('PostgresInventoryRepository.findAll is not yet implemented — wire in a real Postgres client here.');
  }
}

module.exports = { PostgresInventoryRepository };
