'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Result } = require('./Result');

describe('Result construction', () => {
  test('Result.ok produces an Ok carrying the value', () => {
    const result = Result.ok(5);
    assert.equal(result.isOk, true);
    assert.equal(result.isErr, false);
    assert.equal(result.value, 5);
  });

  test('Result.err produces an Err carrying the error', () => {
    const result = Result.err('boom');
    assert.equal(result.isOk, false);
    assert.equal(result.isErr, true);
    assert.equal(result.error, 'boom');
  });
});

describe('Result#map', () => {
  test('applies the function and stays Ok', () => {
    const result = Result.ok(5).map((x) => x + 1);
    assert.equal(result.isOk, true);
    assert.equal(result.value, 6);
  });

  test('passes through untouched on Err', () => {
    const result = Result.err('boom').map((x) => x + 1);
    assert.equal(result.isErr, true);
    assert.equal(result.error, 'boom');
  });
});

describe('Result#mapErr', () => {
  test('passes through untouched on Ok', () => {
    const result = Result.ok(5).mapErr((e) => `wrapped:${e}`);
    assert.equal(result.isOk, true);
    assert.equal(result.value, 5);
  });

  test('applies the function on Err', () => {
    const result = Result.err('boom').mapErr((e) => `wrapped:${e}`);
    assert.equal(result.isErr, true);
    assert.equal(result.error, 'wrapped:boom');
  });
});

describe('Result#flatMap', () => {
  test('chains Ok -> Ok, flattening nested Results', () => {
    const parse = (s) => (Number.isNaN(Number(s)) ? Result.err('not a number') : Result.ok(Number(s)));
    const result = Result.ok('21').flatMap(parse).flatMap((n) => Result.ok(n * 2));
    assert.equal(result.isOk, true);
    assert.equal(result.value, 42);
  });

  test('short-circuits on the first Err in the chain', () => {
    const parse = (s) => (Number.isNaN(Number(s)) ? Result.err('not a number') : Result.ok(Number(s)));
    const result = Result.ok('not-a-number').flatMap(parse).flatMap((n) => Result.ok(n * 2));
    assert.equal(result.isErr, true);
    assert.equal(result.error, 'not a number');
  });

  test('is a no-op on an existing Err', () => {
    const result = Result.err('boom').flatMap((x) => Result.ok(x + 1));
    assert.equal(result.isErr, true);
    assert.equal(result.error, 'boom');
  });
});

describe('Result#match', () => {
  test('invokes the ok branch for Ok', () => {
    const output = Result.ok(5).match({
      ok: (value) => `got ${value}`,
      err: () => 'never',
    });
    assert.equal(output, 'got 5');
  });

  test('invokes the err branch for Err', () => {
    const output = Result.err('boom').match({
      ok: () => 'never',
      err: (error) => `failed: ${error}`,
    });
    assert.equal(output, 'failed: boom');
  });
});

describe('Result#unwrap / unwrapOr', () => {
  test('unwrap returns the value for Ok', () => {
    assert.equal(Result.ok(5).unwrap(), 5);
  });

  test('unwrap throws for Err', () => {
    assert.throws(() => Result.err(new Error('boom')).unwrap(), /boom/);
    assert.throws(() => Result.err('boom').unwrap(), /boom/);
  });

  test('unwrapOr returns the value for Ok and the default for Err', () => {
    assert.equal(Result.ok(5).unwrapOr(0), 5);
    assert.equal(Result.err('boom').unwrapOr(0), 0);
  });
});
