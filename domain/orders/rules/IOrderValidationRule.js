'use strict';

/**
 * Interface IOrderValidationRule
 * Decouples volatile business policies from core use case code following the Open/Closed Principle.
 */
class IOrderValidationRule {
  /**
   * Validates an order against business rule configuration
   * @param {import('../entities/Order').Order} order
   * @param {Object} [config]
   * @returns {Object|null} Violation object if rule violated, or null if valid
   */
  validate(order, config) {
    throw new Error('IOrderValidationRule#validate must be implemented by subclass');
  }
}

module.exports = { IOrderValidationRule };
