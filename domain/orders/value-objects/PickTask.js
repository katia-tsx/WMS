'use strict';

/**
 * PickTask Value Object
 */
class PickTask {
  constructor({ id, locationCode, sku, quantity, pickerId = null, status = 'PENDING' }) {
    if (!id || typeof id !== 'string') throw new Error('PickTask requires id');
    if (!locationCode || typeof locationCode !== 'string') throw new Error('PickTask requires locationCode');
    if (!sku || typeof sku !== 'string') throw new Error('PickTask requires sku');
    if (typeof quantity !== 'number' || quantity <= 0) throw new Error('PickTask requires positive quantity');

    this.id = id;
    this.locationCode = locationCode;
    this.sku = sku;
    this.quantity = quantity;
    this.pickerId = pickerId;
    this.status = status;
  }
}

module.exports = { PickTask };
