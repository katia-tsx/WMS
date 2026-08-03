'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validateBody } = require('./validateBody');
const { ValidationError } = require('../../../../domain/shared-kernel/errors/DomainError');

function runMiddleware(middleware, req) {
  return new Promise((resolve, reject) => {
    middleware(req, {}, (err) => (err ? reject(err) : resolve()));
  });
}

describe('validateBody', () => {
  const schema = {
    type: 'object',
    required: ['amount'],
    properties: { amount: { type: 'number', minimum: 1 } },
  };

  test('calls next() with no error when the body satisfies the schema', async () => {
    const req = { body: { amount: 5 } };
    await assert.doesNotReject(() => runMiddleware(validateBody(schema), req));
  });

  test('calls next(ValidationError) with every violation joined into one message', async () => {
    const req = { body: {} };
    await assert.rejects(() => runMiddleware(validateBody(schema), req), (error) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /amount is required/);
      return true;
    });
  });

  test('never mutates req.body', async () => {
    const req = { body: { amount: 5 } };
    await runMiddleware(validateBody(schema), req);
    assert.deepEqual(req.body, { amount: 5 });
  });
});
