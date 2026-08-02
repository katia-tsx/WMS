'use strict';

/**
 * InventoryRepositoryPort — outbound port for persisting and retrieving
 * inventory Products. This file has no implementation: it is the
 * contract the application layer codes against. Concrete adapters (e.g.
 * infrastructure/database/InMemoryInventoryRepository, or a future
 * PostgresInventoryRepository) implement this shape, but the application
 * layer never imports them directly — see the Dependency Inversion
 * Principle section in ARCHITECTURE.md.
 *
 * Kept narrow on purpose (Interface Segregation Principle): a use case
 * that only needs to read stock should not be forced to depend on a
 * port that also knows how to publish events or send emails.
 *
 * @typedef {Object} InventoryRepositoryPort
 * @property {function(sku: string): Promise<import('../../domain/inventory/entities/Product').Product|null>} findBySku
 * @property {function(product: import('../../domain/inventory/entities/Product').Product): Promise<void>} save
 * @property {function(): Promise<import('../../domain/inventory/entities/Product').Product[]>} findAll
 */

module.exports = {};
