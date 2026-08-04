'use strict';

/**
 * Swappable IRouteOptimizationEngine Port Interface
 * Formulates the core Vehicle Routing Problem (VRP) interface, allowing
 * different solvers (2-opt local search, OR-Tools, genetic algorithms) to be plugged in.
 */
class IRouteOptimizationEngine {
  /**
   * Solves VRP instance and returns optimized routes set
   * @param {Object} vrpProblemInstance - { depot, stops, availableVehicles, constraints }
   * @returns {Promise<{ routes: Array, unassignedStops: Array, constraintViolations: Array, solverMetrics: Object }>}
   */
  async optimize(vrpProblemInstance) {
    throw new Error('IRouteOptimizationEngine#optimize must be implemented by subclass');
  }
}

module.exports = { IRouteOptimizationEngine };
