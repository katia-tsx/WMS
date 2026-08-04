'use strict';

/**
 * Cached RuleConfigRepository loading threshold & flag configurations per warehouse
 */
class RuleConfigRepository {
  constructor() {
    this._configs = new Map([
      ['wh-east', { minimumOrderValue: 50, maxCreditLimit: 10000, restrictedCombos: [['HAZMAT-1', 'FLAMMABLE-2']] }],
      ['wh-west', { minimumOrderValue: 25, maxCreditLimit: 15000, restrictedCombos: [] }],
    ]);
  }

  async getConfigForWarehouse(warehouseId = 'wh-east') {
    return this._configs.get(warehouseId) || { minimumOrderValue: 50, maxCreditLimit: 10000 };
  }

  async updateConfigForWarehouse(warehouseId, config) {
    this._configs.set(warehouseId, config);
  }
}

module.exports = { RuleConfigRepository };
