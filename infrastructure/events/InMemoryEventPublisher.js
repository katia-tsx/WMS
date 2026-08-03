'use strict';

/**
 * @typedef {import('../../application/ports/EventPublisherPort').EventPublisherPort} EventPublisherPort
 */

/**
 * InMemoryEventPublisher — a driven adapter for EventPublisherPort that
 * records every published event instead of dispatching it anywhere. Used
 * in test mode so an integration test can assert on which events were
 * published, deterministically, without a real broker or console noise.
 *
 * @implements {EventPublisherPort}
 */
class InMemoryEventPublisher {
  constructor() {
    /** @type {Object[]} */
    this.publishedEvents = [];
  }

  /** @param {Object} event */
  async publish(event) {
    this.publishedEvents.push(event);
  }
}

module.exports = { InMemoryEventPublisher };
