'use strict';

/**
 * AuditCountEntry Value Object
 * Represents a blind count entry performed by an independent operator during an annual audit session.
 */
class AuditCountEntry {
  /**
   * @param {Object} params
   * @param {string} params.operatorId
   * @param {string} params.binId
   * @param {string} params.sku
   * @param {number} params.count
   * @param {boolean} [params.isRecount=false]
   * @param {Date} [params.timestamp]
   */
  constructor({ operatorId, binId, sku, count, isRecount = false, timestamp = new Date() }) {
    if (!operatorId || typeof operatorId !== 'string') {
      throw new Error('AuditCountEntry requires a valid operatorId');
    }
    if (!binId || typeof binId !== 'string') {
      throw new Error('AuditCountEntry requires a valid binId');
    }
    if (!sku || typeof sku !== 'string') {
      throw new Error('AuditCountEntry requires a valid sku');
    }
    if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
      throw new Error('AuditCountEntry count must be a non-negative integer');
    }

    this.operatorId = operatorId;
    this.binId = binId;
    this.sku = sku;
    this.count = count;
    this.isRecount = Boolean(isRecount);
    this.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
  }
}

module.exports = { AuditCountEntry };
