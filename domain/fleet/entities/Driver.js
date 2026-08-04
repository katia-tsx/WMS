'use strict';

/**
 * Driver Entity
 */
class Driver {
  constructor({ id, name, licenseNumber, certExpiryDate, status = 'ACTIVE' }) {
    if (!id || typeof id !== 'string') throw new Error('Driver requires id');
    if (!name || typeof name !== 'string') throw new Error('Driver requires name');
    if (!certExpiryDate) throw new Error('Driver requires certExpiryDate');

    this.id = id;
    this.name = name;
    this.licenseNumber = licenseNumber || 'LIC-UNKNOWN';
    this.certExpiryDate = certExpiryDate instanceof Date ? certExpiryDate : new Date(certExpiryDate);
    this.status = status;
  }

  isCertificationExpired(now = new Date()) {
    return this.certExpiryDate < now;
  }
}

module.exports = { Driver };
