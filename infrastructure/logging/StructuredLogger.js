'use strict';

const { withTraceId } = require('./CorrelationContext');

/**
 * @typedef {import('../../application/ports/ILogger').ILogger} ILogger
 */

/**
 * StructuredLogger — a driven adapter for ILogger that writes one JSON
 * object per line to stdout (stderr for `error`), the shape a real log
 * aggregator (a JSON-aware collector, not a human reading a terminal —
 * that's what ConsoleLogger is for) expects: `{ timestamp, level,
 * message, traceId?, ...context }`. `traceId` is filled in automatically
 * from whatever `runWithTraceId` established for the current
 * request/use-case chain (see CorrelationContext.js) — callers never
 * pass it themselves, which is what guarantees every log line for one
 * request shares it, not just the ones a developer remembered to thread
 * it through.
 *
 * @implements {ILogger}
 */
class StructuredLogger {
  /**
   * @param {'debug'|'info'|'warn'|'error'} level
   * @param {string} message
   * @param {Object} [context]
   * @param {Error} [error]
   */
  _write(level, message, context, error) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...withTraceId(context),
      ...(error ? { error: { name: error.name, message: error.message, stack: error.stack } } : {}),
    };

    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else {
      console.log(line);
    }
  }

  /** @param {string} message @param {Object} [context] */
  debug(message, context) {
    this._write('debug', message, context);
  }

  /** @param {string} message @param {Object} [context] */
  info(message, context) {
    this._write('info', message, context);
  }

  /** @param {string} message @param {Object} [context] */
  warn(message, context) {
    this._write('warn', message, context);
  }

  /**
   * @param {string} message
   * @param {Object} [context]
   * @param {Error} [error]
   */
  error(message, context, error) {
    this._write('error', message, context, error);
  }
}

module.exports = { StructuredLogger };
