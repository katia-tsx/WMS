'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ConsoleEventPublisher } = require('./ConsoleEventPublisher');

describe('ConsoleEventPublisher', () => {
  test('publish and publishAll run without throwing', async () => {
    const publisher = new ConsoleEventPublisher();
    await assert.doesNotReject(async () => {
      await publisher.publish({ eventType: 'a' });
      await publisher.publishAll([{ eventType: 'a' }, { eventType: 'b' }]);
    });
  });
});
