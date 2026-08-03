'use strict';

const { toHttpResponse } = require('../ResultToHttpMapper');

/**
 * OrderController — a driving adapter for the Orders bounded context.
 * Only one endpoint exists so far: fulfilling an order, backed by the
 * real `OrderFulfillmentOrchestrator` (application/orchestrators). There
 * is no dedicated OrderController fully wired for creating/listing
 * orders yet because there's no CreateOrderUseCase/order-query use case
 * behind it — see infrastructure/adapters/http/README.md for what a new
 * module's controller looks like once one exists, rather than this file
 * guessing at endpoints nothing backs.
 *
 * Same shape as InventoryController: framework-agnostic, returns a
 * plain `{ status, body }` descriptor via the centralized
 * ResultToHttpMapper, never touches `res` or a domain entity directly.
 *
 * @param {Object} deps
 * @param {{ fulfill: function(*): Promise<import('../../../../domain/shared-kernel/result/Result').Result> }} deps.orderFulfillmentOrchestrator
 */
function createOrderController({ orderFulfillmentOrchestrator }) {
  return {
    /**
     * POST /orders/fulfill
     * @param {{ body: { lines: {sku: string, quantity: number}[] }, url: string }} req
     * @returns {Promise<{status: number, body?: Object, headers?: Object}>}
     */
    async fulfillOrder(req) {
      const result = await orderFulfillmentOrchestrator.fulfill(req.body);
      return toHttpResponse(result, { instance: req.url });
    },
  };
}

module.exports = { createOrderController };
