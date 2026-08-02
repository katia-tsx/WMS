'use strict';

/**
 * Quantity is a non-negative integer amount of stock. Modeling it as a
 * value object instead of a raw number stops negative or fractional
 * quantities from ever entering the domain.
 */
class Quantity {
  /** @param {number} value */
  constructor(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Quantity must be a non-negative integer, got "${value}".`);
    }
    this.value = value;
    Object.freeze(this);
  }

  /** @param {Quantity} other */
  add(other) {
    return new Quantity(this.value + other.value);
  }

  /** @param {Quantity} other */
  subtract(other) {
    return new Quantity(this.value - other.value);
  }
}

module.exports = { Quantity };
