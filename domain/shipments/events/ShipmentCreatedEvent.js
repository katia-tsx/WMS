'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class ShipmentCreatedEvent extends DomainEvent {
  constructor(shipment) {
    super('shipments.shipment-created', {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      packagesCount: shipment.packages.length,
    });
  }
}

module.exports = { ShipmentCreatedEvent };
