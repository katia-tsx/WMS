'use strict';

/**
 * @typedef {import('../../application/ports/ILogger').ILogger} ILogger
 */

/**
 * InMemoryLogger — a driven adapter for ILogger that records every entry
 * in memory instead of printing it. Used in test mode so an integration
 * test can assert on what was logged (e.g. "did the pipeline log this
 * use case's failure") without console noise in test output.
 *
 * @implements {ILogger}
 */
class InMemoryLogger {
  constructor() {
    /** @type {{level: string, message: string, context: Object|undefined, error: Error|undefined}[]} */
    this.entries = [];
  }

  /** @param {string} message @param {Object} [context] */
  debug(message, context) {
    this.entries.push({ level: 'debug', message, context, error: undefined });
  }

  /** @param {string} message @param {Object} [context] */
  info(message, context) {
    this.entries.push({ level: 'info', message, context, error: undefined });
  }

  /** @param {string} message @param {Object} [context] */
  warn(message, context) {
    this.entries.push({ level: 'warn', message, context, error: undefined });
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   * @param {Error} [error]
   */
  error(message, context, error) {
    this.entries.push({ level: 'error', message, context, error });
  }
}

module.exports = { InMemoryLogger };
