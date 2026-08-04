'use strict';

/**
 * Depot Value Object
 * Origin / Return warehouse location for VRP routing.
 */
class Depot {
  constructor({ id = 'depot-main', name = 'Central Warehouse', latitude, longitude }) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Depot requires numeric latitude and longitude');
    }

    this.id = id;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
  }
}

module.exports = { Depot };
