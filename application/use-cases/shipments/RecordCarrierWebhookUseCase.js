'use strict';

const { UseCase } = require('../UseCase');
const { ShipmentStatusChangedEvent } = require('../../../domain/shipments/events/ShipmentStatusChangedEvent');

class RecordCarrierWebhookUseCase extends UseCase {
  constructor({ shipmentRepository, processedEventsRepository, eventPublisher }) {
    super();
    this.shipmentRepository = shipmentRepository;
    this.processedEventsRepository = processedEventsRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ eventId, trackingNumber, newStatus }) {
    if (!eventId) throw new Error('RecordCarrierWebhookUseCase requires eventId');

    // Deduplication check: check if event has already been processed
    if (this.processedEventsRepository) {
      const isAlreadyProcessed = await this.processedEventsRepository.hasProcessed(eventId);
      if (isAlreadyProcessed) {
        return { isDuplicate: true, status: 'SKIPPED_DUPLICATE' };
      }
    }

    const shipment = await this.shipmentRepository.findByTrackingNumber(trackingNumber);
    if (!shipment) throw new Error(`Shipment with tracking number ${trackingNumber} not found`);

    const prevStatus = shipment.status;
    shipment.updateStatus(newStatus);

    await this.shipmentRepository.save(shipment);

    if (this.processedEventsRepository) {
      await this.processedEventsRepository.markProcessed(eventId);
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new ShipmentStatusChangedEvent(shipment, prevStatus));
    }

    return {
      isDuplicate: false,
      shipmentId: shipment.id,
      previousStatus: prevStatus,
      newStatus: shipment.status,
    };
  }
}

module.exports = { RecordCarrierWebhookUseCase };
