'use strict';

const { AggregateRoot } = require('../../shared-kernel/entities/AggregateRoot');
const { StockLevelChangedEvent } = require('../events/StockLevelChangedEvent');
const { StockDepletedEvent } = require('../events/StockDepletedEvent');
const { LowStockThresholdBreachedEvent } = require('../events/LowStockThresholdBreachedEvent');

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
 *
 * Extends AggregateRoot (domain/shared-kernel), so every state change
 * that other parts of the system need to react to is recorded with
 * `this.addDomainEvent(...)` right where it happens — Product never
 * publishes anything itself, and never imports an IEventPublisher/EventBus
 * (that would violate domain/'s zero-infrastructure rule). Whoever calls
 * a method that adds events is responsible for eventually calling
 * `pullDomainEvents()` and handing them to a publisher — in this
 * codebase, that is TransactionalUseCaseDecorator or ApplicationService,
 * and only after the write that persisted this Product has committed.
 */
class Product extends AggregateRoot {
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

    super(sku);
    this.sku = sku;
    this.name = name;
    this.quantityOnHand = quantityOnHand;
    this.reorderThreshold = reorderThreshold;
  }

  /** @param {number} amount */
  receiveStock(amount) {
    if (amount <= 0) throw new Error('receiveStock amount must be positive.');

    const previousQuantityOnHand = this.quantityOnHand;
    this.quantityOnHand += amount;
    this.addDomainEvent(new StockLevelChangedEvent(this.sku, previousQuantityOnHand, this.quantityOnHand));
  }

  /** @param {number} amount */
  reserveStock(amount) {
    if (amount <= 0) throw new Error('reserveStock amount must be positive.');
    if (amount > this.quantityOnHand) {
      throw new InsufficientStockError(this.sku, amount, this.quantityOnHand);
    }

    const previousQuantityOnHand = this.quantityOnHand;
    this.quantityOnHand -= amount;
    this.addDomainEvent(new StockLevelChangedEvent(this.sku, previousQuantityOnHand, this.quantityOnHand));

    if (this.quantityOnHand === 0) {
      this.addDomainEvent(new StockDepletedEvent(this.sku));
    } else if (previousQuantityOnHand > this.reorderThreshold && this.isBelowReorderThreshold()) {
      // Fired only on the transition across the threshold, not on every
      // subsequent reservation while already below it.
      this.addDomainEvent(new LowStockThresholdBreachedEvent(this.sku, this.quantityOnHand, this.reorderThreshold));
    }
  }

  isBelowReorderThreshold() {
    return this.quantityOnHand <= this.reorderThreshold;
  }
}

module.exports = { Product, InsufficientStockError };
