'use strict';

/**
 * StockLevelService holds a business rule that spans a collection of
 * Products rather than belonging to any single one of them. Like every
 * domain service, it is pure: no I/O, no knowledge of how Products are
 * persisted or where they came from.
 */
class StockLevelService {
  /**
   * @param {import('../entities/Product').Product[]} products
   * @returns {import('../entities/Product').Product[]}
   */
  findProductsNeedingReorder(products) {
    return products.filter((product) => product.isBelowReorderThreshold());
  }
}

module.exports = { StockLevelService };
