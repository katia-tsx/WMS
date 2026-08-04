'use strict';

/**
 * Swappable IAnalyticsEventProjector Port Interface
 * Projects historical domain events into CQRS reporting read-models.
 */
class IAnalyticsEventProjector {
  /**
   * Projects a domain event into analytics read models.
   * @param {import('../../domain/shared-kernel/events/DomainEvent').DomainEvent} domainEvent
   */
  async projectEvent(domainEvent) {
    throw new Error('IAnalyticsEventProjector#projectEvent must be implemented by subclass');
  }
}

module.exports = { IAnalyticsEventProjector };
