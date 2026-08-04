'use strict';

const { UseCase } = require('../UseCase');
const { DeliveryExceptionEvent } = require('../../../domain/shipments/events/DeliveryExceptionEvent');

class ReportDeliveryExceptionUseCase extends UseCase {
  constructor({ shipmentRepository, eventPublisher }) {
    super();
    this.shipmentRepository = shipmentRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ shipmentId, type, description }) {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    const exception = shipment.addException(type, description);
    await this.shipmentRepository.save(shipment);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new DeliveryExceptionEvent(shipment, exception));
    }

    return {
      shipmentId: shipment.id,
      exceptionId: exception.id,
      status: shipment.status,
    };
  }
}

module.exports = { ReportDeliveryExceptionUseCase };
