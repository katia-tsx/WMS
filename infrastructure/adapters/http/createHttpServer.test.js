'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createHttpServer } = require('./createHttpServer');
const { Router } = require('./Router');

describe('createHttpServer', () => {
  test('boots a real Node HTTP server that delegates every request to router.handle', async () => {
    const router = new Router();
    router.get('/ping', async () => ({ status: 200, body: { pong: true } }));

    const server = createHttpServer(router);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/ping`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { pong: true });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('a real request for an unmatched path gets a real 404 Problem Details response over the wire', async () => {
    const router = new Router();
    const server = createHttpServer(router);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/nope`);
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('content-type'), 'application/problem+json');
      const body = await response.json();
      assert.equal(body.code, 'NOT_FOUND');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
