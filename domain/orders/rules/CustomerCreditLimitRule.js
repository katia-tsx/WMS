'use strict';

const { IOrderValidationRule } = require('./IOrderValidationRule');

class CustomerCreditLimitRule extends IOrderValidationRule {
  validate(order, config = {}) {
    const maxCredit = config.maxCreditLimit ?? 10000;
    const totalVal = order.lines.reduce((sum, l) => sum + l.quantity * (l.unitPrice || 0), 0);

    if (totalVal > maxCredit) {
      return {
        rule: 'CustomerCreditLimitRule',
        message: `Order value ($${totalVal.toFixed(2)}) exceeds customer available credit limit ($${maxCredit.toFixed(2)}).`,
        severity: 'ERROR',
      };
    }
    return null;
  }
}

module.exports = { CustomerCreditLimitRule };
