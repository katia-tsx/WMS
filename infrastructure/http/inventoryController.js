'use strict';

const {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
} = require('../../domain/shared-kernel/errors/DomainError');
const { AuthorizationError } = require('../../application/errors/AuthorizationError');

/**
 * Maps a DomainError (or AuthorizationError) to the HTTP status code its
 * failure represents, so every controller normalizes errors the same way
 * instead of each guessing its own status codes — this is the "error
 * normalization" cross-cutting concern controllers get by depending only
 * on a use case's Result, never on how any given use case fails.
 *
 * @param {Error} error
 * @returns {number}
 */
function statusForError(error) {
  if (error instanceof ValidationError) return 400;
  if (error instanceof AuthorizationError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  if (error instanceof BusinessRuleViolationError) return 422;
  return 500;
}

/**
 * inventoryController — a driving adapter. It translates an HTTP-shaped
 * request into a call to the application layer, and an application
 * result back into an HTTP-shaped response. It is deliberately framework
 * agnostic (no Express/Fastify import) so it can be wrapped by whichever
 * HTTP framework infrastructure/ ends up using.
 *
 * It never touches a domain entity or repository directly — only the use
 * case (or, in the composition root, the pipeline-wrapped use case; see
 * ARCHITECTURE.md §8) it was handed, and only through `execute(input)`,
 * which always returns a `Result` rather than throwing.
 *
 * @param {{ execute: function(*): Promise<import('../../domain/shared-kernel/result/Result').Result> }} adjustStockUseCase
 */
function createInventoryController(adjustStockUseCase) {
  return {
    /**
     * POST /inventory/:sku/reserve
     * @param {{ params: { sku: string }, body: { amount: number } }} req
     */
    async reserveStock(req) {
      const result = await adjustStockUseCase.execute({
        sku: req.params.sku,
        amount: req.body.amount,
      });

      return result.match({
        ok: (product) => ({ status: 200, body: { sku: product.sku, quantityOnHand: product.quantityOnHand } }),
        err: (error) => ({
          status: statusForError(error),
          body: { code: error.code ?? 'INTERNAL_ERROR', error: error.message },
        }),
      });
    },
  };
}

module.exports = { createInventoryController, statusForError };
