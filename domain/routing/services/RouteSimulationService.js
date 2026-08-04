'use strict';

const { VehiclePositionUpdatedEvent } = require('../events/VehiclePositionUpdatedEvent');

/**
 * RouteSimulationService Domain Service
 * Given a dispatched Route, interpolates vehicle position along stops at configurable speed.
 */
class RouteSimulationService {
  constructor({ eventPublisher, clock } = {}) {
    this.eventPublisher = eventPublisher;
    this.clock = clock;
    this.subscribers = new Map();
  }

  subscribeToPositionUpdates(vehicleId, callback) {
    if (!this.subscribers.has(vehicleId)) {
      this.subscribers.set(vehicleId, []);
    }
    this.subscribers.get(vehicleId).push(callback);
  }

  /**
   * Simulates vehicle position progression along route stops at a given step fraction.
   * @param {import('../entities/Route').Route} route
   * @param {number} [progressRatio=0.5] - Fraction between 0.0 (start) and 1.0 (completion)
   */
  async simulateTick(route, progressRatio = 0.5) {
    if (!route || !route.stops || route.stops.length === 0) return null;

    const depot = route.depot;
    const startLat = depot.latitude;
    const startLon = depot.longitude;
    const endLat = route.stops[route.stops.length - 1].latitude;
    const endLon = route.stops[route.stops.length - 1].longitude;

    // Linear interpolation between depot start and last stop
    const currentLat = Number((startLat + (endLat - startLat) * progressRatio).toFixed(4));
    const currentLon = Number((startLon + (endLon - startLon) * progressRatio).toFixed(4));

    const status = progressRatio > 0.8 ? 'AT_RISK' : 'ON_TIME';

    const event = new VehiclePositionUpdatedEvent({
      vehicleId: route.vehicleId || 'veh-sim',
      routeId: route.id,
      latitude: currentLat,
      longitude: currentLon,
      speedKmH: 55,
      headingDegrees: 45,
      status,
      timestamp: this.clock ? this.clock.now() : new Date(),
    });

    if (this.eventPublisher) {
      await this.eventPublisher.publish(event);
    }

    const callbacks = this.subscribers.get(route.vehicleId) || [];
    for (const cb of callbacks) {
      cb(event);
    }

    return event;
  }
}

module.exports = { RouteSimulationService };
