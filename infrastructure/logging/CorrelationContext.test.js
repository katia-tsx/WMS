'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { runWithTraceId, getTraceId, withTraceId } = require('./CorrelationContext');

describe('getTraceId', () => {
  test('is undefined outside any runWithTraceId call', () => {
    assert.equal(getTraceId(), undefined);
  });

  test('returns the traceId established by the nearest enclosing runWithTraceId', () => {
    runWithTraceId('trace-1', () => {
      assert.equal(getTraceId(), 'trace-1');
    });
  });

  test('propagates through async continuations (awaits) started inside the callback', async () => {
    await runWithTraceId('trace-async', async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(getTraceId(), 'trace-async');
    });
  });

  test('propagates through nested function calls, without passing traceId explicitly', () => {
    function threeLevelsDeep() {
      function levelTwo() {
        function levelThree() {
          return getTraceId();
        }
        return levelThree();
      }
      return levelTwo();
    }

    runWithTraceId('trace-nested', () => {
      assert.equal(threeLevelsDeep(), 'trace-nested');
    });
  });

  test('two concurrent traces never see each other\'s traceId', async () => {
    const results = await Promise.all([
      runWithTraceId('trace-a', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return getTraceId();
      }),
      runWithTraceId('trace-b', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return getTraceId();
      }),
    ]);

    assert.deepEqual(results, ['trace-a', 'trace-b']);
  });

  test('does not leak out to code after runWithTraceId returns', () => {
    runWithTraceId('trace-scoped', () => {});
    assert.equal(getTraceId(), undefined);
  });
});

describe('withTraceId', () => {
  test('returns context unchanged when there is no active trace', () => {
    assert.deepEqual(withTraceId({ sku: 'ABC-123' }), { sku: 'ABC-123' });
    assert.equal(withTraceId(undefined), undefined);
  });

  test('merges traceId into context, first, when a trace is active', () => {
    runWithTraceId('trace-1', () => {
      assert.deepEqual(withTraceId({ sku: 'ABC-123' }), { traceId: 'trace-1', sku: 'ABC-123' });
      assert.deepEqual(Object.keys(withTraceId({ sku: 'ABC-123' })), ['traceId', 'sku']);
    });
  });

  test('returns just { traceId } when context is undefined but a trace is active', () => {
    runWithTraceId('trace-1', () => {
      assert.deepEqual(withTraceId(undefined), { traceId: 'trace-1' });
    });
  });
});
