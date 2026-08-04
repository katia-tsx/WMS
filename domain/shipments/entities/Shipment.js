'use strict';

const { AggregateRoot } = require('../../shared-kernel/entities/AggregateRoot');
const { SHIPMENT_STATUSES, ShipmentStatus } = require('../value-objects/ShipmentStatus');
const { Package } = require('./Package');
const { ShipmentException } = require('./ShipmentException');

class Shipment extends AggregateRoot {
  constructor({
    id,
    orderId,
    packages = [],
    carrierCode = null,
    trackingNumber = null,
    status = SHIPMENT_STATUSES.CREATED,
    exceptions = [],
    createdAt = new Date(),
  }) {
    super(id);
    if (!orderId) throw new Error('Shipment requires orderId');

    this.orderId = orderId;
    this.packages = packages.map((p) => (p instanceof Package ? p : new Package(p)));
    this.carrierCode = carrierCode;
    this.trackingNumber = trackingNumber;
    this.status = ShipmentStatus.validate(status);
    this.exceptions = exceptions.map((e) => (e instanceof ShipmentException ? e : new ShipmentException(e)));
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
  }

  assignCarrier(carrierCode, trackingNumber) {
    this.carrierCode = carrierCode;
    this.trackingNumber = trackingNumber;
    this.status = SHIPMENT_STATUSES.LABEL_GENERATED;
  }

  updateStatus(newStatus) {
    this.status = ShipmentStatus.validate(newStatus);
  }

  addException(type, description) {
    const exId = `ex-${this.id}-${this.exceptions.length + 1}`;
    const ex = new ShipmentException({ id: exId, type, description });
    this.exceptions.push(ex);
    this.status = SHIPMENT_STATUSES.EXCEPTION;
    return ex;
  }
}

module.exports = { Shipment };
