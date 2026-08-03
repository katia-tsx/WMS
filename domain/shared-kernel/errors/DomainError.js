'use strict';

/**
 * DomainError is the root of every expected-business-failure error in the
 * system. It always carries a machine-readable `code` (for callers that
 * branch on error type — HTTP status mapping, i18n lookups, retries) and a
 * human-readable `message` (for logs and developers). Domain code should
 * prefer returning these wrapped in a `Result.err(...)` (see
 * `../result/Result`) over throwing, reserving `throw` for programmer
 * errors that indicate a bug rather than an expected business outcome.
 */
class DomainError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

/** Raised when input fails a validation invariant (see `../guard/Guard`). */
class ValidationError extends DomainError {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'VALIDATION_ERROR') {
    super(code, message);
  }
}

/** Raised when a lookup by identity or key finds nothing. */
class NotFoundError extends DomainError {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'NOT_FOUND') {
    super(code, message);
  }
}

/** Raised when an operation conflicts with the current state of the system. */
class ConflictError extends DomainError {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'CONFLICT') {
    super(code, message);
  }
}

/** Raised when an operation would violate a business rule an entity enforces. */
class BusinessRuleViolationError extends DomainError {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'BUSINESS_RULE_VIOLATION') {
    super(code, message);
  }
}

module.exports = {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
};
