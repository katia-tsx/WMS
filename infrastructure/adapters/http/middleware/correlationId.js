'use strict';

const { randomUUID } = require('node:crypto');
const { runWithTraceId } = require('../../../logging/CorrelationContext');

/**
 * Middleware factory: establishes a correlation id for the rest of the
 * request — reusing an incoming `X-Request-Id` header if the caller (or
 * an upstream gateway) already set one, otherwise generating a fresh
 * one — and runs everything downstream (later middleware, the route
 * handler, and so whatever use case pipeline it calls) inside
 * `runWithTraceId` (see infrastructure/logging/CorrelationContext.js).
 * Every logger call made anywhere in that chain — a controller, a
 * `LoggingUseCaseDecorator`, an `EventBus` subscriber invoked
 * synchronously within it — picks the same `traceId` up automatically,
 * with no explicit parameter passed at any of those call sites.
 *
 * Register this first, before any other middleware (see routes.js), so
 * the trace covers the entire request, including JSON body parsing and
 * validation.
 *
 * @returns {function(*, *, function(Error=):void): void}
 */
function correlationId() {
  return function correlationIdMiddleware(req, res, next) {
    const traceId = req.headers?.['x-request-id'] || randomUUID();
    req.traceId = traceId;
    if (typeof res.setHeader === 'function') {
      res.setHeader('X-Request-Id', traceId);
    }
    runWithTraceId(traceId, () => next());
  };
}

module.exports = { correlationId };
