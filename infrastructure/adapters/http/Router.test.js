'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { Router, compilePath } = require('./Router');

/** @param {{method?: string, url?: string, headers?: Object}} [options] */
function mockReq({ method = 'GET', url = '/', headers = {} } = {}) {
  const req = new Readable({ read() {} });
  req.method = method;
  req.url = url;
  req.headers = headers;
  req.push(null); // no body by default; tests needing one push before this
  return req;
}

function mockRes() {
  return {
    statusCode: undefined,
    headers: {},
    body: undefined,
    ended: false,
    writeHead(status, headers) {
      this.statusCode = status;
      Object.assign(this.headers, headers);
    },
    end(payload) {
      this.body = payload;
      this.ended = true;
    },
  };
}

describe('compilePath', () => {
  test('extracts named params in order and builds a matching regex', () => {
    const { regex, paramNames } = compilePath('/inventory/:sku/reserve');
    assert.deepEqual(paramNames, ['sku']);
    assert.ok(regex.test('/inventory/ABC-123/reserve'));
    assert.equal(regex.test('/inventory/ABC-123/reserve/extra'), false);
  });

  test('escapes regex-special characters in literal segments', () => {
    const { regex } = compilePath('/health.check');
    assert.ok(regex.test('/health.check'));
    assert.equal(regex.test('/healthXcheck'), false); // '.' must be literal, not "any char"
  });
});

describe('Router — routing and path params', () => {
  test('dispatches to the handler whose method and path match, with req.params populated', async () => {
    const router = new Router();
    let received;
    router.get('/inventory/:sku', async (req) => {
      received = req.params;
      return { status: 200, body: { sku: req.params.sku } };
    });

    const res = mockRes();
    await router.handle(mockReq({ method: 'GET', url: '/inventory/ABC-123' }), res);

    assert.deepEqual(received, { sku: 'ABC-123' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body), { sku: 'ABC-123' });
  });

  test('supports multiple path parameters', async () => {
    const router = new Router();
    router.get('/warehouses/:warehouseId/locations/:locationId', async (req) => ({
      status: 200,
      body: req.params,
    }));

    const res = mockRes();
    await router.handle(mockReq({ url: '/warehouses/W1/locations/L9' }), res);

    assert.deepEqual(JSON.parse(res.body), { warehouseId: 'W1', locationId: 'L9' });
  });

  test('ignores the query string when matching the path', async () => {
    const router = new Router();
    router.get('/inventory/:sku', async (req) => ({ status: 200, body: { sku: req.params.sku } }));

    const res = mockRes();
    await router.handle(mockReq({ url: '/inventory/ABC-123?foo=bar' }), res);

    assert.equal(res.statusCode, 200);
  });

  test('404s with a Problem Details body when no route matches', async () => {
    const router = new Router();
    router.get('/inventory/:sku', async () => ({ status: 200, body: {} }));

    const res = mockRes();
    await router.handle(mockReq({ method: 'POST', url: '/nope' }), res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.headers['Content-Type'], 'application/problem+json');
    const body = JSON.parse(res.body);
    assert.equal(body.status, 404);
    assert.equal(body.code, 'NOT_FOUND');
  });
});

describe('Router — middleware chains', () => {
  test('runs global middleware, then per-route middleware, then the handler, in that order', async () => {
    const order = [];
    const router = new Router();
    router.use((req, res, next) => { order.push('global-1'); next(); });
    router.use((req, res, next) => { order.push('global-2'); next(); });
    router.get('/x', async () => { order.push('handler'); return { status: 200 }; }, {
      middleware: [(req, res, next) => { order.push('route-1'); next(); }],
    });

    await router.handle(mockReq({ url: '/x' }), mockRes());

    assert.deepEqual(order, ['global-1', 'global-2', 'route-1', 'handler']);
  });

  test('a middleware can short-circuit by never calling next() and writing nothing — the handler never runs, but the request just never resolves a response either, so real middleware should always call next or reject', async () => {
    // Documents the contract rather than exercising a hang: middleware
    // must call next() (possibly with an error) or throw. This test
    // covers the "throw" half.
    const router = new Router();
    let handlerRan = false;
    router.get('/x', async () => { handlerRan = true; return { status: 200 }; }, {
      middleware: [() => { throw new Error('nope'); }],
    });

    const res = mockRes();
    await router.handle(mockReq({ url: '/x' }), res);

    assert.equal(handlerRan, false);
    assert.equal(res.statusCode, 500);
  });

  test('next(error) skips the handler and is mapped to a Problem Details response', async () => {
    const { ValidationError } = require('../../../domain/shared-kernel/errors/DomainError');
    const router = new Router();
    let handlerRan = false;
    router.post('/x', async () => { handlerRan = true; return { status: 200 }; }, {
      middleware: [(req, res, next) => next(new ValidationError('bad input'))],
    });

    const res = mockRes();
    await router.handle(mockReq({ method: 'POST', url: '/x' }), res);

    assert.equal(handlerRan, false);
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).code, 'VALIDATION_ERROR');
  });

  test('an async middleware that rejects also fails the chain', async () => {
    const router = new Router();
    router.get('/x', async () => ({ status: 200 }), {
      middleware: [async () => { throw new Error('async fail'); }],
    });

    const res = mockRes();
    await router.handle(mockReq({ url: '/x' }), res);

    assert.equal(res.statusCode, 500);
  });
});

describe('Router — error handling', () => {
  test('a handler that throws is mapped to a 500 Problem Details response, not left to crash the process', async () => {
    const router = new Router();
    router.get('/x', async () => { throw new Error('boom'); });

    const res = mockRes();
    await router.handle(mockReq({ url: '/x' }), res);

    assert.equal(res.statusCode, 500);
    const body = JSON.parse(res.body);
    assert.equal(body.detail, 'An unexpected error occurred.'); // never leaks "boom"
  });

  test('a handler rejecting with a DomainError maps to its real status and message', async () => {
    const { ConflictError } = require('../../../domain/shared-kernel/errors/DomainError');
    const router = new Router();
    router.get('/x', async () => { throw new ConflictError('already dispatched'); });

    const res = mockRes();
    await router.handle(mockReq({ url: '/x' }), res);

    assert.equal(res.statusCode, 409);
    assert.equal(JSON.parse(res.body).detail, 'already dispatched');
  });
});
