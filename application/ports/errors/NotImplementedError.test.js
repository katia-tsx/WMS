'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { NotImplementedError } = require('./NotImplementedError');

describe('NotImplementedError', () => {
  test('is an Error carrying portName and methodName', () => {
    const error = new NotImplementedError('IRepository', 'findById');
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'NotImplementedError');
    assert.equal(error.portName, 'IRepository');
    assert.equal(error.methodName, 'findById');
    assert.match(error.message, /IRepository\.findById\(\)/);
  });
});
