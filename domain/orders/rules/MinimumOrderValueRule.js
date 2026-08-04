'use strict';

const { IOrderValidationRule } = require('./IOrderValidationRule');

class MinimumOrderValueRule extends IOrderValidationRule {
  validate(order, config = {}) {
    const minVal = config.minimumOrderValue ?? 50;
    const totalVal = order.lines.reduce((sum, l) => sum + l.quantity * (l.unitPrice || 0), 0);

    if (totalVal < minVal) {
      return {
        rule: 'MinimumOrderValueRule',
        message: `Order total value ($${totalVal.toFixed(2)}) is below the required minimum threshold of $${minVal.toFixed(2)}.`,
        severity: 'ERROR',
      };
    }
    return null;
  }
}

module.exports = { MinimumOrderValueRule };
