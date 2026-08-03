'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('./JsonSchemaValidator');

describe('validate — type', () => {
  test('accepts a matching primitive type', () => {
    assert.deepEqual(validate({ type: 'string' }, 'hello'), []);
    assert.deepEqual(validate({ type: 'number' }, 3.14), []);
    assert.deepEqual(validate({ type: 'boolean' }, true), []);
  });

  test('rejects a mismatched type with a readable message', () => {
    const errors = validate({ type: 'string' }, 42);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /must be of type string, got number/);
  });

  test('"integer" accepts whole numbers but rejects fractional ones', () => {
    assert.deepEqual(validate({ type: 'integer' }, 5), []);
    assert.equal(validate({ type: 'integer' }, 5.5).length, 1);
  });

  test('distinguishes array and object from each other and from null', () => {
    assert.deepEqual(validate({ type: 'array' }, []), []);
    assert.equal(validate({ type: 'array' }, {}).length, 1);
    assert.equal(validate({ type: 'object' }, []).length, 1);
    assert.equal(validate({ type: 'object' }, null).length, 1);
  });
});

describe('validate — object: required / properties / additionalProperties', () => {
  const schema = {
    type: 'object',
    required: ['sku', 'amount'],
    properties: {
      sku: { type: 'string', minLength: 1 },
      amount: { type: 'number', minimum: 1 },
    },
    additionalProperties: false,
  };

  test('accepts a value satisfying every property schema', () => {
    assert.deepEqual(validate(schema, { sku: 'ABC-123', amount: 5 }), []);
  });

  test('reports every missing required property', () => {
    const errors = validate(schema, {});
    assert.equal(errors.length, 2);
    assert.ok(errors.some((e) => e.includes('sku is required')));
    assert.ok(errors.some((e) => e.includes('amount is required')));
  });

  test('validates nested properties against their own schema, with a dotted path', () => {
    const errors = validate(schema, { sku: '', amount: 0 });
    assert.ok(errors.some((e) => e.includes('sku must be at least 1 character')));
    assert.ok(errors.some((e) => e.includes('amount must be >= 1')));
  });

  test('rejects unknown properties when additionalProperties is false', () => {
    const errors = validate(schema, { sku: 'ABC-123', amount: 5, extra: 'nope' });
    assert.ok(errors.some((e) => e.includes('extra is not an allowed property')));
  });

  test('allows unknown properties when additionalProperties is not set', () => {
    const looseSchema = { type: 'object', properties: { sku: { type: 'string' } } };
    assert.deepEqual(validate(looseSchema, { sku: 'ABC-123', extra: 'fine' }), []);
  });
});

describe('validate — array', () => {
  const schema = { type: 'array', minItems: 1, items: { type: 'object', required: ['sku'], properties: { sku: { type: 'string' } } } };

  test('validates each item against the items schema, with an indexed path', () => {
    const errors = validate(schema, [{ sku: 'A' }, {}]);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /\[1]\.sku is required/);
  });

  test('enforces minItems/maxItems', () => {
    assert.equal(validate(schema, []).some((e) => e.includes('at least 1 item')), true);
    const maxSchema = { type: 'array', maxItems: 1 };
    assert.equal(validate(maxSchema, [1, 2]).some((e) => e.includes('at most 1 item')), true);
  });
});

describe('validate — enum', () => {
  test('accepts an allowed value and rejects anything else', () => {
    const schema = { type: 'string', enum: ['pending', 'confirmed'] };
    assert.deepEqual(validate(schema, 'pending'), []);
    assert.equal(validate(schema, 'unknown').length, 1);
  });
});

describe('validate — a realistic composite schema (order fulfillment request)', () => {
  const schema = {
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
  };

  test('accepts a well-formed order', () => {
    assert.deepEqual(validate(schema, { lines: [{ sku: 'ABC-123', quantity: 2 }] }), []);
  });

  test('rejects an empty lines array', () => {
    assert.ok(validate(schema, { lines: [] }).length > 0);
  });

  test('rejects a non-integer quantity inside a nested line item', () => {
    const errors = validate(schema, { lines: [{ sku: 'ABC-123', quantity: 1.5 }] });
    assert.match(errors[0], /lines\[0]\.quantity must be of type integer/);
  });
});
