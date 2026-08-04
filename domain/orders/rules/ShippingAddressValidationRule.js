'use strict';

const { IOrderValidationRule } = require('./IOrderValidationRule');

class ShippingAddressValidationRule extends IOrderValidationRule {
  validate(order, config = {}) {
    const addr = order.shippingAddress;
    if (!addr || !addr.street || !addr.city || !addr.zipCode) {
      return {
        rule: 'ShippingAddressValidationRule',
        message: 'Shipping address is incomplete. Street, City, and Zip Code are mandatory.',
        severity: 'ERROR',
      };
    }
    return null;
  }
}

module.exports = { ShippingAddressValidationRule };
