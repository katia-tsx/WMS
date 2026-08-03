'use strict';

/**
 * @typedef {import('../../application/ports/ILogger').ILogger} ILogger
 */

/**
 * ConsoleLogger — a driven adapter for ILogger that writes structured
 * entries to stdout/stderr via console.*. Stands in for a real log
 * aggregator until one is wired up.
 *
 * @implements {ILogger}
 */
class ConsoleLogger {
  /** @param {string} message @param {Object} [context] */
  debug(message, context) {
    console.debug(`[debug] ${message}`, context ?? '');
  }

  /** @param {string} message @param {Object} [context] */
  info(message, context) {
    console.log(`[info] ${message}`, context ?? '');
  }

  /** @param {string} message @param {Object} [context] */
  warn(message, context) {
    console.warn(`[warn] ${message}`, context ?? '');
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   * @param {Error} [error]
   */
  error(message, context, error) {
    console.error(`[error] ${message}`, context ?? '', error ?? '');
  }
}

module.exports = { ConsoleLogger };
