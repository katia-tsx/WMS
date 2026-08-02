'use strict';

/**
 * inventoryController — a driving adapter. It translates an HTTP-shaped
 * request into a call to the application layer, and an application
 * result back into an HTTP-shaped response. It is deliberately framework
 * agnostic (no Express/Fastify import) so it can be wrapped by whichever
 * HTTP framework infrastructure/ ends up using.
 *
 * @param {import('../../application/use-cases/inventory/AdjustStockUseCase').AdjustStockUseCase} adjustStockUseCase
 */
function createInventoryController(adjustStockUseCase) {
  return {
    /**
     * POST /inventory/:sku/reserve
     * @param {{ params: { sku: string }, body: { amount: number } }} req
     */
    async reserveStock(req) {
      try {
        const product = await adjustStockUseCase.execute({
          sku: req.params.sku,
          amount: req.body.amount,
        });
        return { status: 200, body: { sku: product.sku, quantityOnHand: product.quantityOnHand } };
      } catch (error) {
        return { status: 400, body: { error: error.message } };
      }
    },
  };
}

module.exports = { createInventoryController };
