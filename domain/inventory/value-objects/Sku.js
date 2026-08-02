'use strict';

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

/**
 * Sku is an immutable value object: two Skus with the same value are
 * interchangeable, and it validates its own format so no other layer has
 * to remember to.
 */
class Sku {
  /** @param {string} value */
  constructor(value) {
    if (typeof value !== 'string' || !SKU_PATTERN.test(value)) {
      throw new Error(`"${value}" is not a valid Sku (expected uppercase alphanumeric, 3-32 chars).`);
    }
    this.value = value;
    Object.freeze(this);
  }

  /** @param {Sku} other */
  equals(other) {
    return other instanceof Sku && other.value === this.value;
  }

  toString() {
    return this.value;
  }
}

module.exports = { Sku };
