'use strict';

/**
 * DeliveryConstraint Value Object
 */
class DeliveryConstraint {
  constructor({ timeWindowStart = '08:00', timeWindowEnd = '18:00', maxCapacityWeight = 1000, maxDurationMinutes = 480 }) {
    this.timeWindowStart = timeWindowStart;
    this.timeWindowEnd = timeWindowEnd;
    this.maxCapacityWeight = maxCapacityWeight;
    this.maxDurationMinutes = maxDurationMinutes;
  }
}

module.exports = { DeliveryConstraint };
