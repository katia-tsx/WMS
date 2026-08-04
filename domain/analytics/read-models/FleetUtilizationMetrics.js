'use strict';

/**
 * FleetUtilizationMetrics CQRS Read Model
 */
class FleetUtilizationMetrics {
  constructor({ totalVehicles = 0, activeHours = 0, idleHours = 0, avgRouteEfficiencyPercent = 92.5 }) {
    this.totalVehicles = totalVehicles;
    this.activeHours = activeHours;
    this.idleHours = idleHours;
    this.avgRouteEfficiencyPercent = avgRouteEfficiencyPercent;
  }
}

module.exports = { FleetUtilizationMetrics };
