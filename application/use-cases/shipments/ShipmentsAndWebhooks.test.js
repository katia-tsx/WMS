'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { Shipment } = require('../../../domain/shipments/entities/Shipment');
const { Package } = require('../../../domain/shipments/entities/Package');
const { RateShoppingService } = require('../../../domain/shipments/services/RateShoppingService');

const { CreateShipmentUseCase } = require('./CreateShipmentUseCase');
const { GenerateShippingLabelUseCase } = require('./GenerateShippingLabelUseCase');
const { RecordCarrierWebhookUseCase } = require('./RecordCarrierWebhookUseCase');
const { ReportDeliveryExceptionUseCase } = require('./ReportDeliveryExceptionUseCase');

// Dummy Mock Gateway implementing ICarrierGateway for application layer tests
class ApplicationMockGateway {
  constructor(carrierCode = 'FEDEX') {
    this.carrierCode = carrierCode;
  }
  async getRates(packages) {
    const w = packages.reduce((s, p) => s + p.weightKg, 0);
    return [
      { carrierCode: 'STD', serviceName: 'Ground', cost: 10 + w, estimatedDays: 4 },
      { carrierCode: 'EXP', serviceName: 'Express', cost: 30 + w, estimatedDays: 1 },
    ];
  }
  async generateLabel() {
    return { carrierCode: this.carrierCode, trackingNumber: 'TRK-MOCK-123', labelUrl: 'http://label.pdf' };
  }
}

describe('Shipment Aggregate & Value Objects', () => {
  it('manages packages, status transitions, and exception logging', () => {
    const shipment = new Shipment({
      id: 'shp-1',
      orderId: 'ord-100',
      packages: [new Package({ id: 'pkg-1', weightKg: 2.5 })],
    });

    assert.equal(shipment.status, 'CREATED');
    assert.equal(shipment.packages.length, 1);

    shipment.assignCarrier('FEDEX', 'TRK-999');
    assert.equal(shipment.status, 'LABEL_GENERATED');
    assert.equal(shipment.trackingNumber, 'TRK-999');

    const ex = shipment.addException('DAMAGED', 'Package crushed during transit');
    assert.equal(shipment.status, 'EXCEPTION');
    assert.equal(shipment.exceptions.length, 1);
    assert.equal(ex.type, 'DAMAGED');
  });
});

describe('RateShoppingService', () => {
  it('RateShoppingService chooses fastest carrier for VIP priority orders and cheapest for standard orders', () => {
    const quotes = [
      { carrierCode: 'STD', serviceName: 'Ground', cost: 10, estimatedDays: 5 },
      { carrierCode: 'EXP', serviceName: 'Overnight', cost: 30, estimatedDays: 1 },
    ];

    const cheapOption = RateShoppingService.selectBestRate(quotes, 20);
    assert.equal(cheapOption.carrierCode, 'STD');

    const fastOption = RateShoppingService.selectBestRate(quotes, 95);
    assert.equal(fastOption.carrierCode, 'EXP');
  });
});

describe('Shipment Use Cases & Webhook Idempotency', () => {
  it('executes full shipment creation, label generation, and exception reporting', async () => {
    const shipmentsMap = new Map();
    const mockRepo = {
      save: async (s) => shipmentsMap.set(s.id, s),
      findById: async (id) => shipmentsMap.get(id),
      findByTrackingNumber: async (trk) => [...shipmentsMap.values()].find((s) => s.trackingNumber === trk),
    };
    const gateway = new ApplicationMockGateway('FEDEX');

    const createUseCase = new CreateShipmentUseCase({ shipmentRepository: mockRepo });
    const labelUseCase = new GenerateShippingLabelUseCase({ shipmentRepository: mockRepo, carrierGateway: gateway });
    const exceptionUseCase = new ReportDeliveryExceptionUseCase({ shipmentRepository: mockRepo });

    const createRes = await createUseCase.execute({
      shipmentId: 'shp-test',
      orderId: 'ord-test',
      packages: [{ id: 'p1', weightKg: 3.0 }],
    });
    assert.equal(createRes.status, 'CREATED');

    const labelRes = await labelUseCase.execute({ shipmentId: 'shp-test', orderPriorityScore: 90 });
    assert.equal(labelRes.status, 'LABEL_GENERATED');
    assert.ok(labelRes.trackingNumber.length > 0);

    const exRes = await exceptionUseCase.execute({ shipmentId: 'shp-test', type: 'DELAYED', description: 'Weather delay' });
    assert.equal(exRes.status, 'EXCEPTION');
  });

  it('RecordCarrierWebhookUseCase deduplicates retried webhook events by eventId', async () => {
    const shipment = new Shipment({
      id: 'shp-wb',
      orderId: 'ord-wb',
      packages: [{ id: 'p1', weightKg: 1.0 }],
    });
    shipment.assignCarrier('FEDEX', 'TRK-FEDEX-123');

    const mockRepo = {
      findByTrackingNumber: async (trk) => (trk === 'TRK-FEDEX-123' ? shipment : null),
      save: async () => {},
    };

    const processedEvents = new Set();
    const mockProcessedEventsRepo = {
      hasProcessed: async (id) => processedEvents.has(id),
      markProcessed: async (id) => processedEvents.add(id),
    };

    const webhookUseCase = new RecordCarrierWebhookUseCase({
      shipmentRepository: mockRepo,
      processedEventsRepository: mockProcessedEventsRepo,
    });

    // First delivery
    const res1 = await webhookUseCase.execute({ eventId: 'evt-100', trackingNumber: 'TRK-FEDEX-123', newStatus: 'IN_TRANSIT' });
    assert.equal(res1.isDuplicate, false);
    assert.equal(shipment.status, 'IN_TRANSIT');

    // Retried delivery
    const res2 = await webhookUseCase.execute({ eventId: 'evt-100', trackingNumber: 'TRK-FEDEX-123', newStatus: 'IN_TRANSIT' });
    assert.equal(res2.isDuplicate, true);
    assert.equal(res2.status, 'SKIPPED_DUPLICATE');
  });
});
