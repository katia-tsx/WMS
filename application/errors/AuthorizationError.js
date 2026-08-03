'use strict';

const { DomainError } = require('../../domain/shared-kernel/errors/DomainError');

/**
 * AuthorizationError is returned (as a `Result.err`, never thrown across a
 * use-case boundary) when `AuthorizationUseCaseDecorator`'s policy denies
 * a request. It extends the domain's `DomainError` so it carries the same
 * machine-readable `code` / human-readable `message` shape as every other
 * expected business failure, even though "is this actor allowed to do
 * this" is an application-layer concern rather than a bounded context's
 * own business rule — which is why it lives here, in application/errors/,
 * rather than in the domain/shared-kernel error hierarchy.
 */
class AuthorizationError extends DomainError {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'UNAUTHORIZED') {
    super(code, message);
  }
}

module.exports = { AuthorizationError };
