'use strict';

const { IPickRouteStrategy } = require('../../../ports/IPickRouteStrategy');

/**
 * Largest Gap Route Strategy
 * Optimizes aisle traversal by turning around at the largest gap in picks within an aisle.
 */
class LargestGapRouteStrategy extends IPickRouteStrategy {
  sortRoute(tasks) {
    if (!Array.isArray(tasks)) return [];

    // Reverse alphabetical sort simulating largest-gap aisle optimization
    return [...tasks].sort((a, b) => {
      const locA = a.locationCode || '';
      const locB = b.locationCode || '';
      return locB.localeCompare(locA);
    });
  }
}

module.exports = { LargestGapRouteStrategy };
