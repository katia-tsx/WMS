'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

/**
 * Raised when a route planner (see IRoutingEngine) finishes ordering a
 * set of stops for a vehicle. Defined ahead of the Routing bounded
 * context having its own entities/use cases yet (domain/routing is still
 * otherwise scaffolded) — this is the event shape Fleet and
 * Notifications will react to once a PlanRouteUseCase exists to raise it
 * from a real Route aggregate.
 */
class RouteOptimizedEvent extends DomainEvent {
  /**
   * @param {string} routeId
   * @param {string[]} orderedStopIds
   * @param {number} totalDistanceMeters
   */
  constructor(routeId, orderedStopIds, totalDistanceMeters) {
    super('routing.route-optimized');
    this.routeId = routeId;
    this.orderedStopIds = orderedStopIds;
    this.totalDistanceMeters = totalDistanceMeters;
  }
}

module.exports = { RouteOptimizedEvent };
