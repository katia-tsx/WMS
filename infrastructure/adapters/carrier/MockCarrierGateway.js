'use strict';

const crypto = require('crypto');
const { ICarrierGateway } = require('../../../application/ports/ICarrierGateway');

/**
 * MockCarrierGateway Implementation
 * Development / Sandbox adapter implementing ICarrierGateway interface.
 */
class MockCarrierGateway extends ICarrierGateway {
  constructor(carrierCode = 'FEDEX') {
    super();
    this.carrierCode = carrierCode;
  }

  async getRates(packages, destinationAddress) {
    const totalWeight = packages.reduce((sum, p) => sum + p.weightKg, 0);

    return [
      {
        carrierCode: this.carrierCode,
        serviceName: `${this.carrierCode} Ground`,
        cost: Number((12.5 + totalWeight * 1.5).toFixed(2)),
        estimatedDays: 4,
      },
      {
        carrierCode: this.carrierCode,
        serviceName: `${this.carrierCode} Express 2-Day`,
        cost: Number((24.0 + totalWeight * 2.5).toFixed(2)),
        estimatedDays: 2,
      },
      {
        carrierCode: this.carrierCode,
        serviceName: `${this.carrierCode} Overnight`,
        cost: Number((45.0 + totalWeight * 4.0).toFixed(2)),
        estimatedDays: 1,
      },
    ];
  }

  async generateLabel(shipment) {
    const randDigits = Math.floor(100000000 + Math.random() * 900000000);
    const trackingNumber = `TRK-${this.carrierCode}-${randDigits}`;
    const labelUrl = `https://labels.wms.internal/${this.carrierCode}/${trackingNumber}.pdf`;

    return {
      carrierCode: this.carrierCode,
      trackingNumber,
      labelUrl,
    };
  }

  verifyWebhookSignature(payload, signature, secret = 'mock-secret') {
    if (!signature) return false;
    const computedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return computedSig === signature || signature === 'valid-mock-signature';
  }
}

module.exports = { MockCarrierGateway };
