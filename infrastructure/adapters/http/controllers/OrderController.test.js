'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createOrderController } = require('./OrderController');
const { Result } = require('../../../../domain/shared-kernel/result/Result');
const { NotFoundError } = require('../../../../domain/shared-kernel/errors/DomainError');

describe('OrderController#fulfillOrder', () => {
  test('returns 200 with the fulfilled order on Result.ok', async () => {
    const order = { lines: [{ sku: 'ABC-123', quantity: 2 }] };
    const orderFulfillmentOrchestrator = { fulfill: async () => Result.ok(order) };
    const controller = createOrderController({ orderFulfillmentOrchestrator });

    const response = await controller.fulfillOrder({ body: order, url: '/orders/fulfill' });

    assert.deepEqual(response, { status: 200, body: order });
  });

  test('normalizes a Result.err into a Problem Details response with the right status', async () => {
    const orderFulfillmentOrchestrator = {
      fulfill: async () => Result.err(new NotFoundError('No product found for sku "missing".')),
    };
    const controller = createOrderController({ orderFulfillmentOrchestrator });

    const response = await controller.fulfillOrder({
      body: { lines: [{ sku: 'missing', quantity: 1 }] },
      url: '/orders/fulfill',
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'NOT_FOUND');
    assert.equal(response.body.instance, '/orders/fulfill');
  });

  test('passes the request body straight through to the orchestrator, unchanged', async () => {
    let received;
    const order = { lines: [{ sku: 'ABC-123', quantity: 2 }] };
    const orderFulfillmentOrchestrator = {
      fulfill: async (input) => {
        received = input;
        return Result.ok(input);
      },
    };
    const controller = createOrderController({ orderFulfillmentOrchestrator });

    await controller.fulfillOrder({ body: order, url: '/orders/fulfill' });

    assert.equal(received, order);
  });
});
