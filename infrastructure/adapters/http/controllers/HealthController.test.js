'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createHealthController } = require('./HealthController');

describe('HealthController#liveness', () => {
  test('always returns 200 with a status and uptime, never touching a dependency', async () => {
    const inventoryRepository = { findAll: async () => { throw new Error('should never be called'); } };
    const eventPublisher = {};
    const controller = createHealthController({ inventoryRepository, eventPublisher });

    const response = await controller.liveness();

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(typeof response.body.uptimeSeconds, 'number');
  });
});

describe('HealthController#readiness', () => {
  test('returns 200/ready when the database is reachable', async () => {
    const inventoryRepository = { findAll: async () => [] };
    const eventPublisher = {};
    const controller = createHealthController({ inventoryRepository, eventPublisher });

    const response = await controller.readiness();

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ready');
    assert.deepEqual(response.body.checks.database, { status: 'up' });
  });

  test('returns 503/not_ready, with the real error message, when the database check fails', async () => {
    const inventoryRepository = { findAll: async () => { throw new Error('connection refused'); } };
    const eventPublisher = {};
    const controller = createHealthController({ inventoryRepository, eventPublisher });

    const response = await controller.readiness();

    assert.equal(response.status, 503);
    assert.equal(response.body.status, 'not_ready');
    assert.deepEqual(response.body.checks.database, { status: 'down', error: 'connection refused' });
  });

  test('reports eventBus as just "up" for a publisher with no dead-letter queue', async () => {
    const inventoryRepository = { findAll: async () => [] };
    const eventPublisher = { publish: async () => {} }; // e.g. ConsoleEventPublisher/InMemoryEventPublisher
    const controller = createHealthController({ inventoryRepository, eventPublisher });

    const response = await controller.readiness();

    assert.deepEqual(response.body.checks.eventBus, { status: 'up' });
  });

  test('reports the dead-letter queue length for a publisher that has one (e.g. EventBus)', async () => {
    const inventoryRepository = { findAll: async () => [] };
    const eventPublisher = { deadLetterQueue: [{ event: {}, error: new Error('x') }, { event: {}, error: new Error('y') }] };
    const controller = createHealthController({ inventoryRepository, eventPublisher });

    const response = await controller.readiness();

    assert.deepEqual(response.body.checks.eventBus, { status: 'up', deadLetterCount: 2 });
  });

  test('a non-empty dead-letter queue does not, by itself, fail readiness', async () => {
    const inventoryRepository = { findAll: async () => [] };
    const eventPublisher = { deadLetterQueue: [{ event: {}, error: new Error('x') }] };
    const controller = createHealthController({ inventoryRepository, eventPublisher });

    const response = await controller.readiness();

    assert.equal(response.status, 200);
  });
});
