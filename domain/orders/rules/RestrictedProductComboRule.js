'use strict';

const { IOrderValidationRule } = require('./IOrderValidationRule');

class RestrictedProductComboRule extends IOrderValidationRule {
  validate(order, config = {}) {
    const restrictedPairs = config.restrictedCombos || [['HAZMAT-1', 'FLAMMABLE-2']];
    const orderSkus = new Set(order.lines.map((l) => l.productSku));

    for (const [skuA, skuB] of restrictedPairs) {
      if (orderSkus.has(skuA) && orderSkus.has(skuB)) {
        return {
          rule: 'RestrictedProductComboRule',
          message: `Order contains restricted hazardous combination: [${skuA}] cannot be shipped in the same order as [${skuB}].`,
          severity: 'ERROR',
        };
      }
    }
    return null;
  }
}

module.exports = { RestrictedProductComboRule };
