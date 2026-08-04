'use strict';

/**
 * WarehouseKpiSnapshot CQRS Read Model
 */
class WarehouseKpiSnapshot {
  constructor({ date, itemsPicked = 0, itemsPacked = 0, activeOperators = 1, avgCycleTimeMinutes = 45 }) {
    this.date = date || new Date().toISOString().split('T')[0];
    this.itemsPicked = itemsPicked;
    this.itemsPacked = itemsPacked;
    this.activeOperators = activeOperators;
    this.avgCycleTimeMinutes = avgCycleTimeMinutes;
  }
}

module.exports = { WarehouseKpiSnapshot };
