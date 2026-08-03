'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');

/**
 * Backs correlation-id propagation across an entire request/use-case
 * chain without threading a `traceId` parameter through every function
 * signature in between. `infrastructure/adapters/http/middleware/correlationId.js`
 * establishes the store once, at the top of a request; every logger
 * (ConsoleLogger, InMemoryLogger, StructuredLogger) reads it back via
 * `withTraceId` at the moment it writes a log line — so a controller, a
 * use case, and a decorator three layers deep in the same request all
 * share the same `traceId` in their log output, with none of them ever
 * receiving it as an explicit argument.
 */
const storage = new AsyncLocalStorage();

/**
 * Pre:  none.
 * Post: `callback` (and every synchronous/asynchronous continuation it
 *       starts — promises it awaits, callbacks it schedules) runs with
 *       `traceId` available via `getTraceId()`. Nothing outside
 *       `callback`'s call tree is affected; a concurrent, unrelated
 *       request handled on another async chain sees its own `traceId`,
 *       never this one.
 *
 * @template T
 * @param {string} traceId
 * @param {function(): T} callback
 * @returns {T}
 */
function runWithTraceId(traceId, callback) {
  return storage.run({ traceId }, callback);
}

/**
 * @returns {string|undefined} the current traceId, or undefined if
 *   called outside any `runWithTraceId` — e.g. from a test, a migration
 *   script, or process startup before the first request arrives.
 */
function getTraceId() {
  return storage.getStore()?.traceId;
}

/**
 * @param {Object} [context]
 * @returns {Object|undefined} `context` with `traceId` merged in (first
 *   key, so it reads first in a JSON log line) when one is active;
 *   `context` unchanged otherwise — including when `context` itself is
 *   `undefined`, so callers can keep writing `withTraceId(context)`
 *   without a null check.
 */
function withTraceId(context) {
  const traceId = getTraceId();
  if (!traceId) return context;
  return { traceId, ...context };
}

module.exports = { runWithTraceId, getTraceId, withTraceId };
