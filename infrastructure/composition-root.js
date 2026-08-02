'use strict';

const { AdjustStockUseCase } = require('../application/use-cases/inventory/AdjustStockUseCase');
const { OrderFulfillmentOrchestrator } = require('../application/orchestrators/OrderFulfillmentOrchestrator');
const { InMemoryInventoryRepository } = require('./database/InMemoryInventoryRepository');
const { createInventoryController } = require('./http/inventoryController');

/**
 * The composition root is the one place in the whole system allowed to
 * import both application/ (abstractions) and infrastructure/ (concrete
 * adapters) and wire them together. Nothing inside application/ or
 * domain/ ever does this — that is what keeps the Dependency Inversion
 * Principle real instead of aspirational. See ARCHITECTURE.md.
 */
function buildApp() {
  const inventoryRepository = new InMemoryInventoryRepository();
  /** @type {import('../application/ports/EventPublisherPort').EventPublisherPort} */
  const eventPublisher = { publish: async (event) => console.log('[event]', event) };

  const adjustStockUseCase = new AdjustStockUseCase({ inventoryRepository, eventPublisher });
  const orderFulfillmentOrchestrator = new OrderFulfillmentOrchestrator({ adjustStockUseCase });
  const inventoryController = createInventoryController(adjustStockUseCase);

  return { inventoryRepository, adjustStockUseCase, orderFulfillmentOrchestrator, inventoryController };
}

module.exports = { buildApp };
