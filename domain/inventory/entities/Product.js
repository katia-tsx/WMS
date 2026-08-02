'use strict';

/**
 * Domain error raised when a stock operation would leave quantityOnHand
 * negative. It lives in the domain layer because "you cannot reserve more
 * than you have" is a business rule, not a technical constraint.
 */
class InsufficientStockError extends Error {
  /**
   * @param {string} sku
   * @param {number} requested
   * @param {number} available
   */
  constructor(sku, requested, available) {
    super(`Cannot reserve ${requested} unit(s) of "${sku}": only ${available} available.`);
    this.name = 'InsufficientStockError';
    this.sku = sku;
    this.requested = requested;
    this.available = available;
  }
}

/**
 * Product is the aggregate root of the Inventory bounded context. It owns
 * every invariant around its own stock level; nothing outside this class
 * is allowed to mutate quantityOnHand directly.
 */
class Product {
  /**
   * @param {Object} props
   * @param {string} props.sku
   * @param {string} props.name
   * @param {number} props.quantityOnHand
   * @param {number} [props.reorderThreshold]
   */
  constructor({ sku, name, quantityOnHand, reorderThreshold = 0 }) {
    if (!sku) throw new Error('Product requires a sku.');
    if (!name) throw new Error('Product requires a name.');
    if (quantityOnHand < 0) throw new Error('quantityOnHand cannot be negative.');

    this.sku = sku;
    this.name = name;
    this.quantityOnHand = quantityOnHand;
    this.reorderThreshold = reorderThreshold;
  }

  /** @param {number} amount */
  receiveStock(amount) {
    if (amount <= 0) throw new Error('receiveStock amount must be positive.');
    this.quantityOnHand += amount;
  }

  /** @param {number} amount */
  reserveStock(amount) {
    if (amount <= 0) throw new Error('reserveStock amount must be positive.');
    if (amount > this.quantityOnHand) {
      throw new InsufficientStockError(this.sku, amount, this.quantityOnHand);
    }
    this.quantityOnHand -= amount;
  }

  isBelowReorderThreshold() {
    return this.quantityOnHand <= this.reorderThreshold;
  }
}

module.exports = { Product, InsufficientStockError };
