'use strict';

/**
 * @typedef {import('../../application/ports/EventPublisherPort').EventPublisherPort} EventPublisherPort
 */

/**
 * ConsoleEventPublisher — a driven adapter for EventPublisherPort that
 * logs every domain event to stdout. It stands in for a real message
 * bus/webhook dispatcher until one exists; nothing in application/ or
 * domain/ knows events are (for now) just being printed.
 *
 * @implements {EventPublisherPort}
 */
class ConsoleEventPublisher {
  /** @param {Object} event */
  async publish(event) {
    console.log('[event]', event);
  }
}

module.exports = { ConsoleEventPublisher };
