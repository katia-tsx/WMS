'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Port } = require('./Port');
const { NotImplementedError } = require('./errors/NotImplementedError');

class FakeGateway extends Port {
  ping() {
    this._abstract('ping');
  }
}

describe('Port#_abstract', () => {
  test('throws a NotImplementedError naming the concrete subclass and method', () => {
    const gateway = new FakeGateway();
    assert.throws(() => gateway.ping(), (error) => {
      assert.ok(error instanceof NotImplementedError);
      assert.equal(error.portName, 'FakeGateway');
      assert.equal(error.methodName, 'ping');
      return true;
    });
  });
});
