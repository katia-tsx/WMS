'use strict';

const { UseCase } = require('../UseCase');
const { RateShoppingService } = require('../../../domain/shipments/services/RateShoppingService');
const { ShipmentStatusChangedEvent } = require('../../../domain/shipments/events/ShipmentStatusChangedEvent');

class GenerateShippingLabelUseCase extends UseCase {
  constructor({ shipmentRepository, carrierGateway, eventPublisher }) {
    super();
    this.shipmentRepository = shipmentRepository;
    this.carrierGateway = carrierGateway;
    this.eventPublisher = eventPublisher;
  }

  async execute({ shipmentId, orderPriorityScore = 50 }) {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    // Perform rate shopping across carrier gateway quotes
    const quotes = await this.carrierGateway.getRates(shipment.packages, {});
    const bestQuote = RateShoppingService.selectBestRate(quotes, orderPriorityScore);

    // Generate label with winning carrier
    const labelResult = await this.carrierGateway.generateLabel(shipment);
    const prevStatus = shipment.status;

    shipment.assignCarrier(labelResult.carrierCode, labelResult.trackingNumber);
    await this.shipmentRepository.save(shipment);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new ShipmentStatusChangedEvent(shipment, prevStatus));
    }

    return {
      shipmentId: shipment.id,
      carrierCode: shipment.carrierCode,
      trackingNumber: shipment.trackingNumber,
      labelUrl: labelResult.labelUrl,
      selectedQuote: bestQuote,
      status: shipment.status,
    };
  }
}

module.exports = { GenerateShippingLabelUseCase };
