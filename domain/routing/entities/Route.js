'use strict';

const { AggregateRoot } = require('../../shared-kernel/entities/AggregateRoot');
const { Depot } = require('../value-objects/Depot');
const { RouteStop } = require('./RouteStop');
const { HaversineDistanceCalculator } = require('../services/HaversineDistanceCalculator');

class Route extends AggregateRoot {
  constructor({
    id,
    vehicleId = null,
    driverId = null,
    depot,
    stops = [],
    totalDistanceKm = 0,
    totalDurationMinutes = 0,
    status = 'PLANNED',
    createdAt = new Date(),
  }) {
    super(id);
    this.vehicleId = vehicleId;
    this.driverId = driverId;
    this.depot = depot instanceof Depot ? depot : new Depot(depot || { latitude: 30.2672, longitude: -97.7431 });
    this.stops = stops.map((s) => (s instanceof RouteStop ? s : new RouteStop(s)));
    this.totalDistanceKm = totalDistanceKm;
    this.totalDurationMinutes = totalDurationMinutes;
    this.status = status;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
  }

  resequenceStops(newStopsList) {
    this.stops = newStopsList.map((s, idx) => {
      const stop = s instanceof RouteStop ? s : new RouteStop(s);
      stop.sequenceNumber = idx + 1;
      return stop;
    });
    this.recalculateRouteMetrics();
  }

  recalculateRouteMetrics() {
    if (this.stops.length === 0) {
      this.totalDistanceKm = 0;
      this.totalDurationMinutes = 0;
      return;
    }

    let dist = 0;
    let currLat = this.depot.latitude;
    let currLon = this.depot.longitude;

    for (const stop of this.stops) {
      dist += HaversineDistanceCalculator.calculateDistanceKm(currLat, currLon, stop.latitude, stop.longitude);
      currLat = stop.latitude;
      currLon = stop.longitude;
    }

    // Return to depot distance
    dist += HaversineDistanceCalculator.calculateDistanceKm(currLat, currLon, this.depot.latitude, this.depot.longitude);

    this.totalDistanceKm = Number(dist.toFixed(2));
    this.totalDurationMinutes = HaversineDistanceCalculator.estimateDriveTimeMinutes(this.totalDistanceKm);
  }

  assignVehicleAndDriver(vehicleId, driverId) {
    this.vehicleId = vehicleId;
    this.driverId = driverId;
  }

  dispatch() {
    this.status = 'DISPATCHED';
  }
}

module.exports = { Route };
