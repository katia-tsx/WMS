'use strict';

const { Port } = require('./Port');

/**
 * ILogger — outbound port for structured logging. Methods take a
 * `(message, context)` shape rather than printf-style interpolated
 * strings, so every adapter (console, JSON-to-stdout, a log aggregator)
 * can attach fields like a request id or user id as structured data
 * instead of parsing them back out of free text.
 *
 * @interface
 */
class ILogger extends Port {
  /**
   * Pre:  `message` is a human-readable summary; `context` (if given) is a
   *       plain, JSON-serializable object of structured fields.
   * Post: the entry has been handed to the underlying sink. Logging must
   *       never throw for the caller's sake — a logger that fails to log
   *       must not fail the business operation it was logging.
   *
   * @param {string} message
   * @param {Object} [context]
   * @returns {void}
   */
  debug(message, context) {
    this._abstract('debug');
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   * @returns {void}
   */
  info(message, context) {
    this._abstract('info');
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   * @returns {void}
   */
  warn(message, context) {
    this._abstract('warn');
  }

  /**
   * Pre:  same as `info`, plus `error` (if given) is the underlying Error
   *       being reported.
   * Post: same guarantee as `info` — never throws.
   *
   * @param {string} message
   * @param {Object} [context]
   * @param {Error} [error]
   * @returns {void}
   */
  error(message, context, error) {
    this._abstract('error');
  }
}

module.exports = { ILogger };
