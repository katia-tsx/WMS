'use strict';

/**
 * RouteStop Entity
 */
class RouteStop {
  constructor({
    id,
    orderId,
    latitude,
    longitude,
    demandWeight = 10,
    sequenceNumber = 1,
    estimatedArrivalTime = null,
    serviceDurationMinutes = 15,
    status = 'PENDING',
  }) {
    if (!id) throw new Error('RouteStop requires id');
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('RouteStop requires valid numeric coordinates');
    }

    this.id = id;
    this.orderId = orderId;
    this.latitude = latitude;
    this.longitude = longitude;
    this.demandWeight = demandWeight;
    this.sequenceNumber = sequenceNumber;
    this.estimatedArrivalTime = estimatedArrivalTime;
    this.serviceDurationMinutes = serviceDurationMinutes;
    this.status = status;
  }
}

module.exports = { RouteStop };
