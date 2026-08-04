'use strict';

const { IPickRouteStrategy } = require('../../../ports/IPickRouteStrategy');

/**
 * Serpentine Route Strategy
 * Sorts tasks in snake-like pattern through aisles (up aisle 1, down aisle 2, up aisle 3...).
 */
class SerpentineRouteStrategy extends IPickRouteStrategy {
  sortRoute(tasks) {
    if (!Array.isArray(tasks)) return [];

    return [...tasks].sort((a, b) => {
      const locA = a.locationCode || '';
      const locB = b.locationCode || '';
      return locA.localeCompare(locB);
    });
  }
}

module.exports = { SerpentineRouteStrategy };
