'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { StructuredLogger } = require('./StructuredLogger');
const { runWithTraceId } = require('./CorrelationContext');

/** @param {function(): void} fn */
function captureConsole(fn) {
  const logLines = [];
  const errorLines = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (line) => logLines.push(line);
  console.error = (line) => errorLines.push(line);
  try {
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  return { logLines, errorLines };
}

describe('StructuredLogger', () => {
  test('writes debug/info/warn as a single JSON line to console.log', () => {
    const logger = new StructuredLogger();
    const { logLines } = captureConsole(() => {
      logger.debug('debug msg');
      logger.info('info msg', { sku: 'ABC-123' });
      logger.warn('warn msg');
    });

    assert.equal(logLines.length, 3);
    const [debugEntry, infoEntry, warnEntry] = logLines.map((line) => JSON.parse(line));

    assert.equal(debugEntry.level, 'debug');
    assert.equal(debugEntry.message, 'debug msg');
    assert.ok(debugEntry.timestamp);

    assert.equal(infoEntry.level, 'info');
    assert.equal(infoEntry.sku, 'ABC-123');

    assert.equal(warnEntry.level, 'warn');
  });

  test('writes error as a single JSON line to console.error, including the error\'s name/message/stack', () => {
    const logger = new StructuredLogger();
    const boom = new TypeError('boom');
    const { errorLines, logLines } = captureConsole(() => {
      logger.error('something failed', { sku: 'ABC-123' }, boom);
    });

    assert.equal(logLines.length, 0);
    assert.equal(errorLines.length, 1);
    const entry = JSON.parse(errorLines[0]);
    assert.equal(entry.level, 'error');
    assert.equal(entry.message, 'something failed');
    assert.equal(entry.sku, 'ABC-123');
    assert.equal(entry.error.name, 'TypeError');
    assert.equal(entry.error.message, 'boom');
    assert.ok(entry.error.stack);
  });

  test('timestamp is a valid, parseable ISO-8601 string', () => {
    const logger = new StructuredLogger();
    const { logLines } = captureConsole(() => logger.info('msg'));
    const entry = JSON.parse(logLines[0]);
    assert.equal(new Date(entry.timestamp).toISOString(), entry.timestamp);
  });

  test('includes traceId automatically when logging inside an active correlation context, without the caller passing it', () => {
    const logger = new StructuredLogger();
    let logLines;
    runWithTraceId('trace-xyz', () => {
      ({ logLines } = captureConsole(() => logger.info('inside a request', { sku: 'ABC-123' })));
    });

    const entry = JSON.parse(logLines[0]);
    assert.equal(entry.traceId, 'trace-xyz');
    assert.equal(entry.sku, 'ABC-123');
  });

  test('omits traceId entirely when there is no active correlation context', () => {
    const logger = new StructuredLogger();
    const { logLines } = captureConsole(() => logger.info('outside any request'));
    const entry = JSON.parse(logLines[0]);
    assert.equal('traceId' in entry, false);
  });

  test('two log lines within the same trace share the same traceId', () => {
    const logger = new StructuredLogger();
    let logLines;
    runWithTraceId('shared-trace', () => {
      ({ logLines } = captureConsole(() => {
        logger.info('step one');
        logger.info('step two');
      }));
    });

    const [first, second] = logLines.map((line) => JSON.parse(line));
    assert.equal(first.traceId, 'shared-trace');
    assert.equal(second.traceId, 'shared-trace');
  });
});
