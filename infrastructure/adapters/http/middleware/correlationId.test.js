'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { correlationId } = require('./correlationId');
const { getTraceId } = require('../../../logging/CorrelationContext');

function mockRes() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; } };
}

function runMiddleware(middleware, req, res) {
  return new Promise((resolve, reject) => {
    middleware(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

describe('correlationId middleware', () => {
  test('generates a fresh traceId when no X-Request-Id header is present', async () => {
    const req = { headers: {} };
    const res = mockRes();
    let seenInsideNext;

    const middleware = correlationId();
    await new Promise((resolve) => {
      middleware(req, res, () => { seenInsideNext = getTraceId(); resolve(); });
    });

    assert.equal(typeof req.traceId, 'string');
    assert.ok(req.traceId.length > 0);
    assert.equal(seenInsideNext, req.traceId);
  });

  test('reuses an incoming X-Request-Id header instead of generating a new one', async () => {
    const req = { headers: { 'x-request-id': 'client-supplied-id' } };
    const res = mockRes();
    await runMiddleware(correlationId(), req, res);
    assert.equal(req.traceId, 'client-supplied-id');
  });

  test('sets the X-Request-Id response header to the same traceId', async () => {
    const req = { headers: {} };
    const res = mockRes();
    await runMiddleware(correlationId(), req, res);
    assert.equal(res.headers['X-Request-Id'], req.traceId);
  });

  test('getTraceId() is unset again once the middleware\'s next() callback returns', async () => {
    const req = { headers: {} };
    const res = mockRes();
    await runMiddleware(correlationId(), req, res);
    assert.equal(getTraceId(), undefined);
  });

  test('tolerates a res with no setHeader (e.g. a bare test double)', async () => {
    const req = { headers: {} };
    await assert.doesNotReject(() => runMiddleware(correlationId(), req, {}));
  });
});
