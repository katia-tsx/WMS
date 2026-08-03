'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { statusForError, toProblemDetails, toHttpResponse, PROBLEM_CONTENT_TYPE } = require('./ResultToHttpMapper');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
} = require('../../../domain/shared-kernel/errors/DomainError');
const { AuthorizationError } = require('../../../application/errors/AuthorizationError');

describe('statusForError', () => {
  test('maps each known DomainError subclass to its HTTP status', () => {
    assert.equal(statusForError(new ValidationError('m')), 400);
    assert.equal(statusForError(new AuthorizationError('m')), 403);
    assert.equal(statusForError(new NotFoundError('m')), 404);
    assert.equal(statusForError(new ConflictError('m')), 409);
    assert.equal(statusForError(new BusinessRuleViolationError('m')), 422);
  });

  test('maps anything else — including a bare thrown Error — to 500', () => {
    assert.equal(statusForError(new Error('boom')), 500);
    assert.equal(statusForError(new TypeError('bad arg')), 500);
  });
});

describe('toProblemDetails', () => {
  test('builds an RFC 7807 body for an expected failure, passing the real message and code through', () => {
    const { status, body, headers } = toProblemDetails(new NotFoundError('No product found for sku "X".'), {
      instance: '/inventory/X/reserve',
    });

    assert.equal(status, 404);
    assert.equal(headers['Content-Type'], PROBLEM_CONTENT_TYPE);
    assert.deepEqual(body, {
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'No product found for sku "X".',
      code: 'NOT_FOUND',
      instance: '/inventory/X/reserve',
    });
  });

  test('omits instance when not provided', () => {
    const { body } = toProblemDetails(new ValidationError('bad input'));
    assert.equal('instance' in body, false);
  });

  test('redacts the real message for a 500, never leaking internal error detail', () => {
    const { status, body } = toProblemDetails(new TypeError('Cannot read property "x" of undefined'));

    assert.equal(status, 500);
    assert.equal(body.detail, 'An unexpected error occurred.');
    assert.equal(body.code, 'INTERNAL_ERROR');
    assert.equal(body.title, 'Internal Server Error');
  });

  test('defaults code to INTERNAL_ERROR for an expected-status error with no .code', () => {
    class BareError extends NotFoundError {}
    const error = new BareError('not found');
    delete error.code;
    const { body } = toProblemDetails(error);
    assert.equal(body.code, 'INTERNAL_ERROR');
  });
});

describe('toHttpResponse', () => {
  test('maps Result.ok to a 200 with the value as the body by default', () => {
    const response = toHttpResponse(Result.ok({ sku: 'ABC-123' }));
    assert.deepEqual(response, { status: 200, body: { sku: 'ABC-123' } });
  });

  test('maps Result.ok through an onOk projection when given one', () => {
    const response = toHttpResponse(Result.ok({ sku: 'ABC-123', quantityOnHand: 5, internal: 'secret' }), {
      onOk: (product) => ({ sku: product.sku, quantityOnHand: product.quantityOnHand }),
    });
    assert.deepEqual(response, { status: 200, body: { sku: 'ABC-123', quantityOnHand: 5 } });
  });

  test('maps Result.err to a Problem Details response', () => {
    const response = toHttpResponse(Result.err(new ConflictError('already shipped')), { instance: '/x' });
    assert.equal(response.status, 409);
    assert.equal(response.body.code, 'CONFLICT');
    assert.equal(response.body.instance, '/x');
  });
});
