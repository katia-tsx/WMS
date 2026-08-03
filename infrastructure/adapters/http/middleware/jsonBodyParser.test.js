'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { jsonBodyParser } = require('./jsonBodyParser');

function mockReq({ method, contentType, body }) {
  const req = new Readable({ read() {} });
  req.method = method;
  req.headers = contentType ? { 'content-type': contentType } : {};
  if (body !== undefined) req.push(body);
  req.push(null);
  return req;
}

function runMiddleware(middleware, req) {
  return new Promise((resolve, reject) => {
    middleware(req, {}, (err) => (err ? reject(err) : resolve()));
  });
}

describe('jsonBodyParser', () => {
  test('parses a valid JSON body into req.body', async () => {
    const req = mockReq({ method: 'POST', contentType: 'application/json', body: '{"amount":5}' });
    await runMiddleware(jsonBodyParser(), req);
    assert.deepEqual(req.body, { amount: 5 });
  });

  test('treats an empty body as {}', async () => {
    const req = mockReq({ method: 'POST', contentType: 'application/json', body: '' });
    await runMiddleware(jsonBodyParser(), req);
    assert.deepEqual(req.body, {});
  });

  test('rejects malformed JSON with a ValidationError, never reaching next() successfully', async () => {
    const { ValidationError } = require('../../../../domain/shared-kernel/errors/DomainError');
    const req = mockReq({ method: 'POST', contentType: 'application/json', body: '{not valid json' });
    await assert.rejects(() => runMiddleware(jsonBodyParser(), req), ValidationError);
  });

  test('skips parsing for a GET request, defaulting req.body to {}', async () => {
    const req = mockReq({ method: 'GET' });
    await runMiddleware(jsonBodyParser(), req);
    assert.deepEqual(req.body, {});
  });

  test('skips parsing when Content-Type is not application/json', async () => {
    const req = mockReq({ method: 'POST', contentType: 'text/plain', body: 'hello' });
    await runMiddleware(jsonBodyParser(), req);
    assert.deepEqual(req.body, {});
  });

  test('rejects a body larger than the configured limit', async () => {
    const { ValidationError } = require('../../../../domain/shared-kernel/errors/DomainError');
    const req = mockReq({ method: 'POST', contentType: 'application/json', body: '{"a":"' + 'x'.repeat(100) + '"}' });
    await assert.rejects(() => runMiddleware(jsonBodyParser({ maxBytes: 10 }), req), ValidationError);
  });
});
