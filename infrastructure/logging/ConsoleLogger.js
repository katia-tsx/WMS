'use strict';

const { withTraceId } = require('./CorrelationContext');

/**
 * @typedef {import('../../application/ports/ILogger').ILogger} ILogger
 */

/**
 * ConsoleLogger — a driven adapter for ILogger that writes human-readable
 * entries to stdout/stderr via console.*, for a developer reading a
 * terminal (see StructuredLogger for the JSON-per-line shape a real log
 * aggregator wants instead). Still includes `traceId` — via
 * `withTraceId`, the same mechanism StructuredLogger uses — so a
 * request's log lines can be correlated in development too, not only in
 * production.
 *
 * @implements {ILogger}
 */
class ConsoleLogger {
  /** @param {string} message @param {Object} [context] */
  debug(message, context) {
    console.debug(`[debug] ${message}`, withTraceId(context) ?? '');
  }

  /** @param {string} message @param {Object} [context] */
  info(message, context) {
    console.log(`[info] ${message}`, withTraceId(context) ?? '');
  }

  /** @param {string} message @param {Object} [context] */
  warn(message, context) {
    console.warn(`[warn] ${message}`, withTraceId(context) ?? '');
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   * @param {Error} [error]
   */
  error(message, context, error) {
    console.error(`[error] ${message}`, withTraceId(context) ?? '', error ?? '');
  }
}

module.exports = { ConsoleLogger };
