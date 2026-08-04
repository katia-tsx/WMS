'use strict';

class OrderValidationChain {
  constructor(rules = []) {
    this.rules = [...rules];
  }

  addRule(rule) {
    this.rules.push(rule);
    return this;
  }

  async validate(order, config = {}) {
    const violations = [];

    for (const rule of this.rules) {
      const violation = await rule.validate(order, config);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  }
}

module.exports = { OrderValidationChain };
