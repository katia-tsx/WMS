'use strict';

const { IValidator } = require('../../ports/IValidator');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { ValidationError } = require('../../../domain/shared-kernel/errors/DomainError');

/**
 * AdjustStockInputValidator is the Validator strategy for
 * AdjustStockUseCase's input: a well-formed sku string and a positive
 * amount. Kept separate from the use case itself (Single Responsibility)
 * and from Product's own invariants (Sku format, non-negative stock) —
 * this only checks the *shape* of the request, before any repository
 * call is made, not business rules that depend on stored state.
 *
 * @implements {IValidator}
 */
class AdjustStockInputValidator extends IValidator {
  /**
   * @param {{ sku: string, amount: number }} input
   * @returns {import('../../../domain/shared-kernel/result/Result').Result}
   */
  validate(input) {
    if (!input || typeof input.sku !== 'string' || input.sku.trim().length === 0) {
      return Result.err(new ValidationError('sku is required and must be a non-empty string.'));
    }
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
      return Result.err(new ValidationError('amount is required and must be a positive number.'));
    }
    return Result.ok(input);
  }
}

module.exports = { AdjustStockInputValidator };
