'use strict';

const { MockCarrierGateway } = require('../../carrier/MockCarrierGateway');

/**
 * CarrierWebhookController
 * Webhook ingestion HTTP adapter for third-party carrier status callbacks.
 * Verifies HMAC signatures before processing and returns fast 200 responses.
 */
class CarrierWebhookController {
  constructor({ carrierGateway = new MockCarrierGateway(), recordCarrierWebhookUseCase }) {
    this.carrierGateway = carrierGateway;
    this.recordCarrierWebhookUseCase = recordCarrierWebhookUseCase;
  }

  /**
   * HTTP POST webhook ingestion handler
   * @param {Object} req - { headers, body, rawBody }
   * @returns {Promise<{ status: number, data: Object }>}
   */
  async handleWebhook(req) {
    const signature = req.headers?.['x-carrier-signature'] || req.headers?.['X-Carrier-Signature'] || '';
    const rawBody = req.rawBody || JSON.stringify(req.body || {});

    // Verify HMAC signature
    const isValid = this.carrierGateway.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return {
        status: 401,
        data: { error: 'Unauthorized: Invalid carrier webhook HMAC signature' },
      };
    }

    const { eventId, trackingNumber, newStatus } = req.body || {};
    if (!eventId || !trackingNumber || !newStatus) {
      return {
        status: 400,
        data: { error: 'Bad Request: Missing required webhook fields (eventId, trackingNumber, newStatus)' },
      };
    }

    const result = await this.recordCarrierWebhookUseCase.execute({
      eventId,
      trackingNumber,
      newStatus,
    });

    return {
      status: 200,
      data: {
        received: true,
        processed: !result.isDuplicate,
        result,
      },
    };
  }
}

module.exports = { CarrierWebhookController };
