'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createApiRouter } = require('./routes');
const { createHttpServer } = require('./createHttpServer');
const { buildApp } = require('../../di/CompositionRoot');
const { Product } = require('../../../domain/inventory/entities/Product');

/**
 * Full-stack integration test: a real CompositionRoot-built app (in
 * 'test' mode — in-memory adapters, no Docker/Postgres required, same
 * as infrastructure/di/CompositionRoot.test.js), wired into a real
 * Router, served over a real socket via createHttpServer, and hit with
 * real HTTP requests. This is the same "prove it end to end" standard
 * applied to infra/migrations/migrate.sh and CompositionRoot.js in
 * earlier work — Router.test.js and the controller tests already cover
 * each piece in isolation with mocks; this proves they're wired
 * together correctly.
 */
async function withServer(t, fn) {
  const app = buildApp({ mode: 'test' });
  const router = createApiRouter({ inventoryController: app.inventoryController, orderController: app.orderController });
  const server = createHttpServer(router);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await fn({ app, baseUrl: `http://127.0.0.1:${port}` });
}

describe('API routes — end to end over a real HTTP server', () => {
  test('GET /health', async (t) => {
    await withServer(t, async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/health`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ok' });
    });
  });

  test('POST /inventory/:sku/reserve — success', async (t) => {
    await withServer(t, async ({ app, baseUrl }) => {
      await app.inventoryRepository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 }));

      const response = await fetch(`${baseUrl}/inventory/ABC-123/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 4 }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { sku: 'ABC-123', quantityOnHand: 6 });
    });
  });

  test('POST /inventory/:sku/reserve — unknown sku maps to 404 Problem Details', async (t) => {
    await withServer(t, async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/inventory/missing/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1 }),
      });

      assert.equal(response.status, 404);
      assert.equal(response.headers.get('content-type'), 'application/problem+json');
      const body = await response.json();
      assert.equal(body.code, 'NOT_FOUND');
      assert.equal(body.instance, '/inventory/missing/reserve');
    });
  });

  test('POST /inventory/:sku/reserve — malformed body is rejected by validateBody before the use case runs, as a 400', async (t) => {
    await withServer(t, async ({ app, baseUrl }) => {
      await app.inventoryRepository.save(new Product({ sku: 'ABC-123', name: 'Widget', quantityOnHand: 10 }));

      const response = await fetch(`${baseUrl}/inventory/ABC-123/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: -5 }), // violates minimum: 1
      });

      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.code, 'VALIDATION_ERROR');

      // Prove the use case genuinely never ran: stock is untouched.
      const stillTen = await app.inventoryRepository.findBySku('ABC-123');
      assert.equal(stillTen.quantityOnHand, 10);
    });
  });

  test('POST /inventory/:sku/reserve — truly malformed JSON is rejected by jsonBodyParser as a 400', async (t) => {
    await withServer(t, async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/inventory/ABC-123/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not valid json',
      });

      assert.equal(response.status, 400);
    });
  });

  test('POST /orders/fulfill — success, atomically across lines', async (t) => {
    await withServer(t, async ({ app, baseUrl }) => {
      await app.inventoryRepository.save(new Product({ sku: 'A', name: 'Widget A', quantityOnHand: 10 }));
      await app.inventoryRepository.save(new Product({ sku: 'B', name: 'Widget B', quantityOnHand: 10 }));

      const response = await fetch(`${baseUrl}/orders/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: [{ sku: 'A', quantity: 4 }, { sku: 'B', quantity: 3 }] }),
      });

      assert.equal(response.status, 200);
      assert.equal((await app.inventoryRepository.findBySku('A')).quantityOnHand, 6);
      assert.equal((await app.inventoryRepository.findBySku('B')).quantityOnHand, 7);
    });
  });

  test('POST /orders/fulfill — a failing line rolls back the whole order, surfaced as the same error over HTTP', async (t) => {
    await withServer(t, async ({ app, baseUrl }) => {
      await app.inventoryRepository.save(new Product({ sku: 'A', name: 'Widget A', quantityOnHand: 10 }));

      const response = await fetch(`${baseUrl}/orders/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: [{ sku: 'A', quantity: 4 }, { sku: 'missing', quantity: 1 }] }),
      });

      assert.equal(response.status, 404);
      assert.equal((await app.inventoryRepository.findBySku('A')).quantityOnHand, 10);
    });
  });

  test('POST /orders/fulfill — an empty lines array is rejected before the orchestrator runs', async (t) => {
    await withServer(t, async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/orders/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: [] }),
      });

      assert.equal(response.status, 400);
    });
  });

  test('GET /openapi.json describes every registered route', async (t) => {
    await withServer(t, async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/openapi.json`);
      assert.equal(response.status, 200);
      const doc = await response.json();

      assert.equal(doc.openapi, '3.0.3');
      assert.ok(doc.paths['/inventory/{sku}/reserve'].post);
      assert.ok(doc.paths['/orders/fulfill'].post);
      assert.ok(doc.paths['/health'].get);
    });
  });
});
