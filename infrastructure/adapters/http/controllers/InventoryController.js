'use strict';

const { toHttpResponse } = require('../ResultToHttpMapper');

/**
 * InventoryController — a driving adapter. It translates an HTTP-shaped
 * request into a call to the application layer, and a use case's
 * `Result` back into an HTTP-shaped `{ status, body }` descriptor via
 * the centralized ResultToHttpMapper — no controller maps errors to
 * status codes itself.
 *
 * It never touches a domain entity or repository directly — only the
 * pipeline-wrapped use case it was handed (see ARCHITECTURE.md §7 and
 * §9: a controller only ever calls a pipeline-wrapped use case, never a
 * bare one and never a domain entity), and only through
 * `execute(input)`, which always returns a `Result` rather than
 * throwing. Deliberately framework-agnostic (no reference to `res`, no
 * import of Router.js): every method takes a plain `req`-shaped object
 * and returns a plain `{ status, body }` object, so it's unit-testable
 * with a plain object literal, no HTTP connection or mock stream needed
 * — see InventoryController.test.js.
 *
 * @param {Object} deps
 * @param {{ execute: function(*): Promise<import('../../../../domain/shared-kernel/result/Result').Result> }} deps.adjustStockUseCasePipeline
 */
function createInventoryController({ adjustStockUseCasePipeline }) {
  return {
    /**
     * POST /inventory/:sku/reserve
     * @param {{ params: { sku: string }, body: { amount: number } }} req
     * @returns {Promise<{status: number, body?: Object, headers?: Object}>}
     */
    async reserveStock(req) {
      const result = await adjustStockUseCasePipeline.execute({
        sku: req.params.sku,
        amount: req.body.amount,
      });

      return toHttpResponse(result, {
        instance: req.url,
        onOk: (product) => ({ sku: product.sku, quantityOnHand: product.quantityOnHand }),
      });
    },
  };
}

module.exports = { createInventoryController };
