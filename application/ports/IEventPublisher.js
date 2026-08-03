'use strict';

const { Port } = require('./Port');

/**
 * IEventPublisher — outbound port for dispatching domain events (see
 * `domain/shared-kernel/events/DomainEvent`) to whatever the outside world
 * uses to react to them: an in-process emitter, a message bus, a webhook
 * dispatcher. A use case collects events with an aggregate's
 * `pullDomainEvents()` after persisting it, then hands them to this port —
 * it never imports a concrete broker directly.
 *
 * @interface
 */
class IEventPublisher extends Port {
  /**
   * Pre:  `event` is a DomainEvent (or event-shaped object).
   * Post: the event has been handed to the outside dispatch mechanism.
   *       Whether that means "delivered" or merely "enqueued" is an
   *       adapter concern (an at-least-once message bus vs. a synchronous
   *       in-process emitter); the port only guarantees the call does not
   *       silently drop the event.
   *
   * @param {import('../../domain/shared-kernel/events/DomainEvent').DomainEvent} event
   * @returns {Promise<void>}
   */
  async publish(event) {
    this._abstract('publish');
  }

  /**
   * Convenience for publishing everything an aggregate buffered, in the
   * order they occurred. Not itself abstract — it is implemented once,
   * here, in terms of `publish`, so adapters only ever need to override
   * `publish`.
   *
   * Pre:  `events` is an array (possibly empty) of DomainEvents.
   * Post: each event has been published, in array order, awaiting each
   *       publish before starting the next.
   *
   * @param {import('../../domain/shared-kernel/events/DomainEvent').DomainEvent[]} events
   * @returns {Promise<void>}
   */
  async publishAll(events) {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

module.exports = { IEventPublisher };
