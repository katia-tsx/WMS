'use strict';

/**
 * EventPublisherPort — outbound port for publishing domain events to
 * whatever the outside world uses for that (an in-process emitter, a
 * message bus, a webhook dispatcher...). The application layer only ever
 * talks to this shape, never to a concrete broker implementation.
 *
 * @typedef {Object} EventPublisherPort
 * @property {function(event: Object): Promise<void>} publish
 */

module.exports = {};
