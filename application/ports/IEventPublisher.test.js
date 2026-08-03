'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IEventPublisher } = require('./IEventPublisher');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('IEventPublisher (base contract)', () => {
  test('publish rejects with NotImplementedError when not overridden', async () => {
    const publisher = new IEventPublisher();
    await assert.rejects(() => publisher.publish({ eventType: 'x' }), NotImplementedError);
  });

  test('publishAll is not abstract but depends on publish, so it also rejects unless publish is overridden', async () => {
    const publisher = new IEventPublisher();
    await assert.rejects(() => publisher.publishAll([{ eventType: 'x' }]), NotImplementedError);
  });
});

describe('IEventPublisher#publishAll (fake adapter)', () => {
  class RecordingEventPublisher extends IEventPublisher {
    constructor() {
      super();
      this.published = [];
    }

    async publish(event) {
      this.published.push(event);
    }
  }

  test('publishes every event in order, using the overridden publish for each', async () => {
    const publisher = new RecordingEventPublisher();
    const events = [{ eventType: 'a' }, { eventType: 'b' }, { eventType: 'c' }];

    await publisher.publishAll(events);

    assert.deepEqual(publisher.published, events);
  });

  test('publishAll on an empty array publishes nothing', async () => {
    const publisher = new RecordingEventPublisher();
    await publisher.publishAll([]);
    assert.deepEqual(publisher.published, []);
  });
});
