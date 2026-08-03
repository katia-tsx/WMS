'use strict';

const { ValidationError } = require('../errors/DomainError');

/**
 * Guard centralizes the invariant checks entities and value objects across
 * every bounded context lean on in their constructors. Each method returns
 * the validated value (so calls can be inlined as `this.x = Guard.against...`)
 * and throws a `ValidationError` — never a bare `Error` — on failure, so
 * callers can pattern-match on `error.code` upstream.
 */
class Guard {
  /**
   * @template T
   * @param {T} value
   * @param {string} argumentName
   * @returns {T}
   */
  static againstNullOrUndefined(value, argumentName) {
    if (value === null || value === undefined) {
      throw new ValidationError(`${argumentName} is required and must not be null or undefined.`);
    }
    return value;
  }

  /**
   * @param {string} value
   * @param {string} argumentName
   * @returns {string}
   */
  static againstEmptyString(value, argumentName) {
    Guard.againstNullOrUndefined(value, argumentName);
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError(`${argumentName} must not be an empty string.`);
    }
    return value;
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @param {string} argumentName
   * @returns {number}
   */
  static inRange(value, min, max, argumentName) {
    Guard.againstNullOrUndefined(value, argumentName);
    if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max) {
      throw new ValidationError(`${argumentName} must be a number between ${min} and ${max}, got "${value}".`);
    }
    return value;
  }

  /**
   * @param {number} value
   * @param {string} argumentName
   * @returns {number}
   */
  static isPositiveNumber(value, argumentName) {
    Guard.againstNullOrUndefined(value, argumentName);
    if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
      throw new ValidationError(`${argumentName} must be a positive number, got "${value}".`);
    }
    return value;
  }
}

module.exports = { Guard };
