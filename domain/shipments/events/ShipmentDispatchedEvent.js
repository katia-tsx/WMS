'use strict';

const { DomainEvent } = require('../../shared-kernel/events/DomainEvent');

/**
 * Raised when a shipment leaves the warehouse for a given order. Defined
 * ahead of the Shipments bounded context having its own entities/use
 * cases yet (domain/shipments is still otherwise scaffolded) — this is
 * the event shape Routing and Notifications will react to once a
 * DispatchShipmentUseCase exists to raise it from a real Shipment
 * aggregate.
 */
class ShipmentDispatchedEvent extends DomainEvent {
  /**
   * @param {string} shipmentId
   * @param {string} orderId
   */
  constructor(shipmentId, orderId) {
    super('shipments.shipment-dispatched');
    this.shipmentId = shipmentId;
    this.orderId = orderId;
  }
}

module.exports = { ShipmentDispatchedEvent };
