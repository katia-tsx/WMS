'use strict';

const { randomUUID } = require('crypto');
const { Guard } = require('../guard/Guard');

/**
 * DomainEvent is the base class for every "something happened" record an
 * AggregateRoot raises. Every event carries a unique `eventId` (so
 * consumers can dedupe/log deliveries) and an `occurredAt` timestamp,
 * alongside whatever payload the concrete subclass adds. Like all domain
 * events, these are plain data: the domain only describes what happened,
 * never how the rest of the system should react — that is an
 * application-layer concern, mediated by an EventPublisherPort.
 */
class DomainEvent {
  /**
   * @param {string} eventType
   */
  constructor(eventType) {
    Guard.againstEmptyString(eventType, 'eventType');
    this.eventId = randomUUID();
    this.eventType = eventType;
    this.occurredAt = new Date();
  }
}

module.exports = { DomainEvent };
