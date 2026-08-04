'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class ShipmentStatusChangedEvent extends DomainEvent {
  constructor(shipment, previousStatus) {
    super('shipments.status-changed', {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      carrierCode: shipment.carrierCode,
      trackingNumber: shipment.trackingNumber,
      previousStatus,
      newStatus: shipment.status,
    });
  }
}

module.exports = { ShipmentStatusChangedEvent };
