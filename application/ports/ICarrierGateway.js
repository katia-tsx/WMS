'use strict';

/**
 * Swappable ICarrierGateway Port Interface
 * Abstracting third-party carrier APIs (label generation, rate shopping, tracking webhooks)
 * satisfying Dependency Inversion Principle.
 */
class ICarrierGateway {
  /**
   * Fetches rate quotes for shipment packages.
   * @param {import('../../domain/shipments/entities/Package').Package[]} packages
   * @param {Object} destinationAddress
   * @returns {Promise<Array<{ carrierCode: string, serviceName: string, cost: number, estimatedDays: number }>>}
   */
  async getRates(packages, destinationAddress) {
    throw new Error('ICarrierGateway#getRates must be implemented by subclass');
  }

  /**
   * Generates shipping label and tracking number.
   * @param {import('../../domain/shipments/entities/Shipment').Shipment} shipment
   * @returns {Promise<{ carrierCode: string, trackingNumber: string, labelUrl: string }>}
   */
  async generateLabel(shipment) {
    throw new Error('ICarrierGateway#generateLabel must be implemented by subclass');
  }

  /**
   * Verifies carrier webhook signature (HMAC validation).
   * @param {string} payload - Raw body string
   * @param {string} signature - Provided signature header
   * @param {string} secret - Secret key
   * @returns {boolean}
   */
  verifyWebhookSignature(payload, signature, secret) {
    throw new Error('ICarrierGateway#verifyWebhookSignature must be implemented by subclass');
  }
}

module.exports = { ICarrierGateway };
