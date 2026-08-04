'use strict';

/**
 * Swappable IPickRouteStrategy Port Interface
 * Sorts PickTask items to minimize physical walking distance in the warehouse.
 */
class IPickRouteStrategy {
  /**
   * Sorts pick tasks into optimal route sequence.
   * @param {import('../../domain/orders/value-objects/PickTask').PickTask[]} tasks
   * @returns {import('../../domain/orders/value-objects/PickTask').PickTask[]} Sorted tasks
   */
  sortRoute(tasks) {
    throw new Error('IPickRouteStrategy#sortRoute must be implemented by subclass');
  }
}

module.exports = { IPickRouteStrategy };
