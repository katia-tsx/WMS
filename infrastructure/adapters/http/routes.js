'use strict';

const { Router } = require('./Router');
const { correlationId } = require('./middleware/correlationId');
const { jsonBodyParser } = require('./middleware/jsonBodyParser');
const { validateBody } = require('./middleware/validateBody');
const { generateOpenApiDocument } = require('./openapi/generateOpenApiDocument');

const RESERVE_STOCK_SCHEMA = {
  type: 'object',
  required: ['amount'],
  properties: {
    amount: { type: 'number', minimum: 1 },
  },
  additionalProperties: false,
};

const FULFILL_ORDER_SCHEMA = {
  type: 'object',
  required: ['lines'],
  properties: {
    lines: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['sku', 'quantity'],
        properties: {
          sku: { type: 'string', minLength: 1 },
          quantity: { type: 'integer', minimum: 1 },
        },
      },
    },
  },
  additionalProperties: false,
};

const PROBLEM_DETAILS_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'integer' },
    detail: { type: 'string' },
    code: { type: 'string' },
    instance: { type: 'string' },
  },
};

/**
 * Registers every route this API serves on a fresh Router, given
 * already-constructed controllers (infrastructure/di/CompositionRoot.js
 * builds each controller exactly once — see its `inventoryController`/
 * `orderController`/`healthController` bindings — and hands them here so
 * routing and controller construction each have one source of truth).
 * This file itself never imports application/ or domain/ directly, so it
 * stays a pure infrastructure/adapters/http/ concern despite being the
 * thing that ties controllers to paths.
 *
 * `correlationId` is registered first, ahead of even body parsing, so
 * the trace it establishes (see
 * infrastructure/logging/CorrelationContext.js) covers the entire
 * request — every log line anywhere in the chain that follows, down
 * through the use case pipeline, shares the same `traceId`.
 *
 * New module, new controller: see infrastructure/adapters/http/README.md
 * for the checklist (controller, request schema, route registration
 * with `meta`) — ShipmentController and the rest follow the same recipe
 * once their use cases exist (see OrderController.js's own comment for
 * why there isn't one yet).
 *
 * @param {Object} deps
 * @param {ReturnType<typeof import('./controllers/InventoryController').createInventoryController>} deps.inventoryController
 * @param {ReturnType<typeof import('./controllers/OrderController').createOrderController>} deps.orderController
 * @param {ReturnType<typeof import('./controllers/HealthController').createHealthController>} deps.healthController
 * @param {import('../../observability/MetricsRegistry').MetricsRegistry} deps.metricsRegistry
 * @returns {Router}
 */
function createApiRouter({ inventoryController, orderController, healthController, metricsRegistry }) {
  const router = new Router({ metrics: metricsRegistry });

  router.use(correlationId());
  router.use(jsonBodyParser());

  router.get('/health', () => healthController.liveness(), {
    meta: {
      summary: 'Liveness probe: is the process up at all? Never checks a dependency.',
      tags: ['Meta'],
      responses: {
        200: {
          description: 'The process is up.',
          schema: { type: 'object', properties: { status: { type: 'string' }, uptimeSeconds: { type: 'integer' } } },
        },
      },
    },
  });

  router.get('/ready', () => healthController.readiness(), {
    meta: {
      summary: 'Readiness probe: can this instance actually serve traffic right now?',
      tags: ['Meta'],
      responses: {
        200: { description: 'Every dependency check passed.' },
        503: { description: 'At least one dependency check failed (see body.checks).' },
      },
    },
  });

  router.get('/metrics', () => ({ status: 200, body: metricsRegistry.toPrometheusText() }), {
    meta: {
      summary: 'Prometheus text-format exposition of request/use-case metrics.',
      tags: ['Meta'],
      responses: { 200: { description: 'Prometheus text exposition format.' } },
    },
  });

  router.post(
    '/inventory/:sku/reserve',
    (req) => inventoryController.reserveStock(req),
    {
      middleware: [validateBody(RESERVE_STOCK_SCHEMA)],
      meta: {
        summary: 'Reserve stock for a SKU',
        tags: ['Inventory'],
        parameters: [{ name: 'sku', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: RESERVE_STOCK_SCHEMA,
        responses: {
          200: {
            description: 'Stock reserved.',
            schema: { type: 'object', properties: { sku: { type: 'string' }, quantityOnHand: { type: 'integer' } } },
          },
          400: { description: 'Malformed request body.', schema: PROBLEM_DETAILS_SCHEMA },
          404: { description: 'No product exists for that SKU.', schema: PROBLEM_DETAILS_SCHEMA },
          422: { description: 'Insufficient stock to reserve the requested amount.', schema: PROBLEM_DETAILS_SCHEMA },
        },
      },
    },
  );

  router.post(
    '/orders/fulfill',
    (req) => orderController.fulfillOrder(req),
    {
      middleware: [validateBody(FULFILL_ORDER_SCHEMA)],
      meta: {
        summary: 'Fulfill an order (reserve stock for every line, atomically)',
        tags: ['Orders'],
        requestBody: FULFILL_ORDER_SCHEMA,
        responses: {
          200: { description: 'Every line was fulfilled.', schema: FULFILL_ORDER_SCHEMA },
          400: { description: 'Malformed request body.', schema: PROBLEM_DETAILS_SCHEMA },
          404: { description: 'A line references a SKU that does not exist.', schema: PROBLEM_DETAILS_SCHEMA },
          422: { description: 'A line could not be fulfilled (e.g. insufficient stock).', schema: PROBLEM_DETAILS_SCHEMA },
        },
      },
    },
  );

  router.get('/openapi.json', async () => ({
    status: 200,
    body: generateOpenApiDocument(router, {
      title: 'AI-Powered WMS API',
      version: '0.1.0',
      description: 'Generated directly from the routes registered in infrastructure/adapters/http/routes.js — see its `meta` on each route.',
    }),
  }), {
    meta: { summary: 'This OpenAPI 3.0 document', tags: ['Meta'], responses: { 200: { description: 'The OpenAPI document.' } } },
  });

  return router;
}

module.exports = { createApiRouter };
