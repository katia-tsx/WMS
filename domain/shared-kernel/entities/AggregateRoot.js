'use strict';

const { Entity } = require('./Entity');

/**
 * AggregateRoot is the base class for the single entry point of an
 * aggregate — the only object outside code is allowed to hold a reference
 * to and invoke behavior on directly (everything else inside the
 * aggregate boundary is reached through it). It adds a domain-event
 * buffer: invariant-changing behavior calls `addDomainEvent(...)`, and the
 * application layer collects them with `pullDomainEvents()` after
 * persisting, so a repository/publisher can dispatch them without the
 * domain layer knowing publishers exist.
 */
class AggregateRoot extends Entity {
  /**
   * @param {string|number} id
   */
  constructor(id) {
    super(id);
    /** @type {import('../events/DomainEvent').DomainEvent[]} */
    this._domainEvents = [];
  }

  /**
   * @param {import('../events/DomainEvent').DomainEvent} event
   */
  addDomainEvent(event) {
    this._domainEvents.push(event);
  }

  /**
   * Returns the buffered events and clears the buffer, so the same event
   * is never handed out twice.
   * @returns {import('../events/DomainEvent').DomainEvent[]}
   */
  pullDomainEvents() {
    const events = this._domainEvents;
    this._domainEvents = [];
    return events;
  }
}

module.exports = { AggregateRoot };
