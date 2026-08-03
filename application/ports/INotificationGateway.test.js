'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { INotificationGateway } = require('./INotificationGateway');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('INotificationGateway (base contract)', () => {
  test('send rejects with NotImplementedError when not overridden', async () => {
    const gateway = new INotificationGateway();
    await assert.rejects(
      () => gateway.send({ recipient: 'ops@example.com', message: 'Low stock' }),
      NotImplementedError,
    );
  });
});

describe('INotificationGateway (fake adapter)', () => {
  class InMemoryNotificationGateway extends INotificationGateway {
    constructor() {
      super();
      this.sent = [];
    }

    async send(notification) {
      this.sent.push(notification);
    }
  }

  test('a fake adapter records notifications for a use case test to assert on', async () => {
    const gateway = new InMemoryNotificationGateway();
    await gateway.send({ recipient: 'ops@example.com', message: 'Low stock' });
    assert.deepEqual(gateway.sent, [{ recipient: 'ops@example.com', message: 'Low stock' }]);
  });
});
