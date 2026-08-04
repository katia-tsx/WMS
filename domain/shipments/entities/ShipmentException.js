'use strict';

/**
 * ShipmentException Entity
 * First-class entity for damaged, lost, delayed shipment exceptions.
 */
class ShipmentException {
  constructor({ id, type, description, resolutionStatus = 'OPEN', reportedAt = new Date() }) {
    if (!id) throw new Error('ShipmentException requires id');
    if (!type || !['DAMAGED', 'LOST', 'DELAYED'].includes(type)) {
      throw new Error(`Invalid exception type: ${type}. Allowed: DAMAGED, LOST, DELAYED`);
    }

    this.id = id;
    this.type = type;
    this.description = description || '';
    this.resolutionStatus = resolutionStatus;
    this.reportedAt = reportedAt instanceof Date ? reportedAt : new Date(reportedAt);
  }

  resolve() {
    this.resolutionStatus = 'RESOLVED';
  }
}

module.exports = { ShipmentException };
