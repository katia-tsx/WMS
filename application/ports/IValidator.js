'use strict';

const { Port } = require('./Port');

/**
 * IValidator<T> — a composable input-validation strategy injected into
 * `UseCase` (see application/use-cases/UseCase.js) so a use case's
 * `handle(input)` never has to re-check "is this input well-formed" —
 * that check already ran, and a malformed request never reaches it.
 *
 * @template T
 * @interface
 */
class IValidator extends Port {
  /**
   * Pre:  none — `input` may be anything, including malformed data from a
   *       driving adapter (an HTTP body, CLI args, ...).
   * Post: returns `Result.ok(input)` if every rule passes, or
   *       `Result.err(ValidationError)` describing the violation
   *       otherwise. Must be a pure function of `input` — no I/O, no
   *       side effects — so validators stay cheap to run before every
   *       use case call.
   *
   * @param {T} input
   * @returns {import('../../domain/shared-kernel/result/Result').Result}
   */
  validate(input) {
    this._abstract('validate');
  }
}

module.exports = { IValidator };
