'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryEventPublisher } = require('./InMemoryEventPublisher');

describe('InMemoryEventPublisher', () => {
  test('publish records the event', async () => {
    const publisher = new InMemoryEventPublisher();
    await publisher.publish({ eventType: 'a' });
    assert.deepEqual(publisher.publishedEvents, [{ eventType: 'a' }]);
  });

  test('publishAll records every event, in order', async () => {
    const publisher = new InMemoryEventPublisher();
    await publisher.publishAll([{ eventType: 'a' }, { eventType: 'b' }]);
    assert.deepEqual(publisher.publishedEvents, [{ eventType: 'a' }, { eventType: 'b' }]);
  });
});
