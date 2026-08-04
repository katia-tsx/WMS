'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class RouteDispatchedEvent extends DomainEvent {
  constructor(route) {
    super('routing.route-dispatched', {
      routeId: route.id,
      vehicleId: route.vehicleId,
      driverId: route.driverId,
      stopsCount: route.stops.length,
      totalDistanceKm: route.totalDistanceKm,
      totalDurationMinutes: route.totalDurationMinutes,
    });
  }
}

module.exports = { RouteDispatchedEvent };
