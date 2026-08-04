'use strict';

const SHIPMENT_STATUSES = {
  CREATED: 'CREATED',
  LABEL_GENERATED: 'LABEL_GENERATED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  EXCEPTION: 'EXCEPTION',
};

class ShipmentStatus {
  static validate(status) {
    if (!SHIPMENT_STATUSES[status]) {
      throw new Error(`Invalid shipment status: ${status}`);
    }
    return status;
  }
}

module.exports = { SHIPMENT_STATUSES, ShipmentStatus };
