'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { MockCarrierGateway } = require('../../carrier/MockCarrierGateway');
const { CarrierWebhookController } = require('./CarrierWebhookController');

describe('CarrierWebhookController HMAC Verification', () => {
  it('rejects invalid HMAC signature with 401 Unauthorized', async () => {
    const gateway = new MockCarrierGateway();
    const controller = new CarrierWebhookController({
      carrierGateway: gateway,
      recordCarrierWebhookUseCase: { execute: async () => {} },
    });

    const req = {
      headers: { 'x-carrier-signature': 'invalid-sig' },
      body: { eventId: 'e1', trackingNumber: 't1', newStatus: 'IN_TRANSIT' },
      rawBody: '{"eventId":"e1"}',
    };

    const res = await controller.handleWebhook(req);
    assert.equal(res.status, 401);
    assert.ok(res.data.error.includes('Unauthorized'));
  });

  it('accepts valid HMAC signature and processes webhook with 200 OK', async () => {
    const gateway = new MockCarrierGateway();
    const controller = new CarrierWebhookController({
      carrierGateway: gateway,
      recordCarrierWebhookUseCase: {
        execute: async () => ({ isDuplicate: false, shipmentId: 's1' }),
      },
    });

    const req = {
      headers: { 'x-carrier-signature': 'valid-mock-signature' },
      body: { eventId: 'e1', trackingNumber: 't1', newStatus: 'IN_TRANSIT' },
      rawBody: '{"eventId":"e1"}',
    };

    const res = await controller.handleWebhook(req);
    assert.equal(res.status, 200);
    assert.equal(res.data.processed, true);
  });
});
