'use strict';

const { Port } = require('./Port');

/**
 * IRoutingEngine — outbound port for the Routing bounded context: turning
 * a set of stops into an optimized route through whatever concrete
 * routing/mapping provider an adapter wraps. No adapter exists yet
 * (domain/routing is still scaffolded) — this port lets routing use cases
 * be written and unit-tested against an in-memory/fake planner before any
 * real provider is wired up.
 *
 * @interface
 */
class IRoutingEngine extends Port {
  /**
   * Pre:  `stops` has at least one stop, each with coordinates the adapter
   *       can consume; `constraints` (if given) are provider-understood
   *       limits (vehicle capacity, time windows, etc.).
   * Post: resolves to an ordered route covering every stop, plus its
   *       total distance and duration. Rejects if no feasible route
   *       exists for the given stops/constraints — that is a
   *       provider/infrastructure failure, not an expected business
   *       outcome.
   *
   * @param {Object[]} stops
   * @param {Object} [constraints]
   * @returns {Promise<{orderedStops: Object[], totalDistanceMeters: number, totalDurationSeconds: number}>}
   */
  async planRoute(stops, constraints) {
    this._abstract('planRoute');
  }
}

module.exports = { IRoutingEngine };
