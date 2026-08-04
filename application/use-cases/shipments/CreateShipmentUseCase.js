'use strict';

const { UseCase } = require('../UseCase');
const { Shipment } = require('../../../domain/shipments/entities/Shipment');
const { ShipmentCreatedEvent } = require('../../../domain/shipments/events/ShipmentCreatedEvent');

class CreateShipmentUseCase extends UseCase {
  constructor({ shipmentRepository, eventPublisher }) {
    super();
    this.shipmentRepository = shipmentRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ shipmentId, orderId, packages }) {
    const id = shipmentId || `shp-${Date.now()}`;
    const shipment = new Shipment({
      id,
      orderId,
      packages,
    });

    await this.shipmentRepository.save(shipment);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new ShipmentCreatedEvent(shipment));
    }

    return {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status,
    };
  }
}

module.exports = { CreateShipmentUseCase };
