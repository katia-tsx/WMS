'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

class DeliveryExceptionEvent extends DomainEvent {
  constructor(shipment, exception) {
    super('shipments.delivery-exception', {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      carrierCode: shipment.carrierCode,
      trackingNumber: shipment.trackingNumber,
      exceptionId: exception.id,
      type: exception.type,
      description: exception.description,
    });
  }
}

module.exports = { DeliveryExceptionEvent };
