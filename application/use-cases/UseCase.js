'use strict';

const { NotImplementedError } = require('../ports/errors/NotImplementedError');

/**
 * UseCase is the base class for every use case under
 * application/use-cases/<context>/. It fixes `execute(input)` as a
 * template method: validate, then handle. Concrete use cases never
 * override `execute` — they override `handle` — so input validation can
 * never be accidentally skipped by a subclass that forgets to call it
 * itself. Both `execute` and `handle` return a `Result` (see
 * domain/shared-kernel/result/Result) rather than throwing, so an
 * expected business failure (not found, a business rule violation, bad
 * input) is data a caller inspects with `.isOk`/`.match(...)`, not an
 * exception it must wrap in try/catch.
 *
 * @interface
 */
class UseCase {
  /**
   * @param {Object} [deps]
   * @param {import('../ports/IValidator').IValidator} [deps.validator] validates input before `handle` runs; omit for a use case with nothing worth validating
   */
  constructor({ validator } = {}) {
    this.validator = validator ?? null;
  }

  /**
   * Pre:  none.
   * Post: if a validator was injected and it rejects `input`, resolves to
   *       its `Result.err(ValidationError)` and `handle` never runs (so
   *       no repository/gateway call happens for malformed input).
   *       Otherwise resolves to whatever `handle(input)` returns.
   *
   * @param {*} input
   * @returns {Promise<import('../../domain/shared-kernel/result/Result').Result>}
   */
  async execute(input) {
    if (this.validator) {
      const validation = this.validator.validate(input);
      if (validation.isErr) {
        return validation;
      }
    }
    return this.handle(input);
  }

  /**
   * Override this, not `execute`, with the use case's actual domain
   * logic. Runs only once validation (if any) has already passed.
   *
   * @param {*} input
   * @returns {Promise<import('../../domain/shared-kernel/result/Result').Result>}
   */
  async handle(input) {
    throw new NotImplementedError(this.constructor.name, 'handle');
  }
}

module.exports = { UseCase };
