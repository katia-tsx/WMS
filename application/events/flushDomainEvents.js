'use strict';

/**
 * Collects buffered domain events off one or more aggregates (anything
 * shaped like AggregateRoot — exposing `pullDomainEvents()`, see
 * domain/shared-kernel/entities/AggregateRoot.js) and hands them to an
 * IEventPublisher, in the order the aggregates are given and, within an
 * aggregate, in the order they were recorded.
 *
 * This is the one place that turns "an aggregate recorded some events"
 * into "a publisher was told about them" — and it must only ever be
 * called after the write that persisted those aggregates has committed
 * (see TransactionalUseCaseDecorator and ApplicationService, the two
 * callers in this codebase), never from inside the transactional work
 * itself and never after a rollback. That ordering is what prevents
 * event leakage: an aggregate whose transaction rolled back still has
 * events sitting in its buffer, but nothing ever calls this function for
 * it, so they are simply discarded along with the rest of its
 * uncommitted state.
 *
 * Non-aggregate values (a plain DTO, undefined, an array mixing both) are
 * tolerated — only pullDomainEvents()-shaped items are asked for events.
 *
 * @param {*} value one aggregate, an array of them, or neither
 * @param {import('../ports/IEventPublisher').IEventPublisher} eventPublisher
 * @returns {Promise<void>}
 */
async function flushDomainEvents(value, eventPublisher) {
  const candidates = Array.isArray(value) ? value : [value];

  for (const candidate of candidates) {
    if (candidate && typeof candidate.pullDomainEvents === 'function') {
      const events = candidate.pullDomainEvents();
      await eventPublisher.publishAll(events);
    }
  }
}

module.exports = { flushDomainEvents };
