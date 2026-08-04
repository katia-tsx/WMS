'use strict';

/**
 * Package Entity
 * Represents a physical package within a shipment.
 */
class Package {
  constructor({ id, weightKg, lengthCm = 30, widthCm = 20, heightCm = 15, items = [] }) {
    if (!id) throw new Error('Package requires id');
    if (typeof weightKg !== 'number' || weightKg <= 0) throw new Error('Package weightKg must be positive');

    this.id = id;
    this.weightKg = weightKg;
    this.lengthCm = lengthCm;
    this.widthCm = widthCm;
    this.heightCm = heightCm;
    this.items = items;
  }
}

module.exports = { Package };
