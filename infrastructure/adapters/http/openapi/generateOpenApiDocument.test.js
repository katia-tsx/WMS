'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Router } = require('../Router');
const { generateOpenApiDocument, toOpenApiPath } = require('./generateOpenApiDocument');

describe('toOpenApiPath', () => {
  test('converts every :param segment to {param}', () => {
    assert.equal(toOpenApiPath('/inventory/:sku/reserve'), '/inventory/{sku}/reserve');
    assert.equal(toOpenApiPath('/warehouses/:warehouseId/locations/:locationId'), '/warehouses/{warehouseId}/locations/{locationId}');
  });

  test('leaves a path with no params unchanged', () => {
    assert.equal(toOpenApiPath('/orders/fulfill'), '/orders/fulfill');
  });
});

describe('generateOpenApiDocument', () => {
  test('produces the info block as given', () => {
    const router = new Router();
    const doc = generateOpenApiDocument(router, { title: 'WMS API', version: '1.0.0', description: 'desc' });
    assert.deepEqual(doc.info, { title: 'WMS API', version: '1.0.0', description: 'desc' });
    assert.equal(doc.openapi, '3.0.3');
  });

  test('builds a path entry from route metadata, converting :param -> {param}', () => {
    const router = new Router();
    router.post('/inventory/:sku/reserve', async () => ({ status: 200 }), {
      meta: {
        summary: 'Reserve stock',
        tags: ['Inventory'],
        parameters: [{ name: 'sku', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { type: 'object', required: ['amount'], properties: { amount: { type: 'number' } } },
        responses: {
          200: { description: 'Reserved', schema: { type: 'object', properties: { sku: { type: 'string' } } } },
          404: { description: 'Not found' },
        },
      },
    });

    const doc = generateOpenApiDocument(router, { title: 'WMS API', version: '1.0.0' });
    const operation = doc.paths['/inventory/{sku}/reserve'].post;

    assert.equal(operation.summary, 'Reserve stock');
    assert.deepEqual(operation.tags, ['Inventory']);
    assert.deepEqual(operation.parameters, [{ name: 'sku', in: 'path', required: true, schema: { type: 'string' } }]);
    assert.equal(operation.requestBody.required, true);
    assert.deepEqual(operation.requestBody.content['application/json'].schema, {
      type: 'object', required: ['amount'], properties: { amount: { type: 'number' } },
    });
    assert.deepEqual(operation.responses['200'], {
      description: 'Reserved',
      content: { 'application/json': { schema: { type: 'object', properties: { sku: { type: 'string' } } } } },
    });
    assert.deepEqual(operation.responses['404'], { description: 'Not found' });
  });

  test('multiple methods on the same path each get their own operation entry', () => {
    const router = new Router();
    router.get('/inventory/:sku', async () => ({ status: 200 }), { meta: { summary: 'Get' } });
    router.post('/inventory/:sku', async () => ({ status: 200 }), { meta: { summary: 'Create' } });

    const doc = generateOpenApiDocument(router, { title: 'WMS API', version: '1.0.0' });

    assert.equal(doc.paths['/inventory/{sku}'].get.summary, 'Get');
    assert.equal(doc.paths['/inventory/{sku}'].post.summary, 'Create');
  });

  test('a route registered with no meta still appears, with empty responses', () => {
    const router = new Router();
    router.get('/health', async () => ({ status: 200 }));

    const doc = generateOpenApiDocument(router, { title: 'WMS API', version: '1.0.0' });

    assert.deepEqual(doc.paths['/health'].get, { responses: {} });
  });
});
