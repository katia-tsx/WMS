'use strict';

const { Guard } = require('../../domain/shared-kernel/guard/Guard');

/**
 * @typedef {import('../../application/ports/IEventPublisher').IEventPublisher} IEventPublisher
 * @typedef {import('../../domain/shared-kernel/events/DomainEvent').DomainEvent} DomainEvent
 */

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} pattern e.g. 'inventory.stock-depleted', 'inventory.*', or '*'
 * @param {string} eventType
 * @returns {boolean}
 */
function topicMatches(pattern, eventType) {
  if (pattern === '*' || pattern === eventType) return true;
  if (pattern.endsWith('.*')) {
    const namespace = pattern.slice(0, -1); // 'inventory.*' -> 'inventory.'
    return eventType.startsWith(namespace);
  }
  return false;
}

/**
 * EventBus is an in-process publish/subscribe implementation of
 * IEventPublisher. It is the "eventual consistency" seam of this system:
 * once a use case's write has committed, the events an aggregate recorded
 * (see domain/shared-kernel's AggregateRoot#addDomainEvent) are handed
 * here, and every interested subscriber — possibly in a different
 * bounded context — reacts independently, on its own schedule, without
 * the original transaction waiting on it or being able to fail it.
 *
 * Subscribers register for a topic pattern — an exact eventType (e.g.
 * `'inventory.stock-depleted'`) or a namespace wildcard (`'inventory.*'`,
 * or `'*'` for everything) — and a mode:
 *
 *   - `'sync'`  — run in registration order, each awaited before the next
 *     starts, and before `publish()` resolves. Use for handlers whose
 *     side effects the publisher's caller needs to be visible immediately
 *     (e.g. updating an in-process read model other code queries right
 *     after).
 *   - `'async'` (default) — run independently of each other and of
 *     `publish()`'s caller; still awaited internally so retries/dead-
 *     lettering work, but never block a sync subscriber or another async
 *     subscriber.
 *
 * A subscriber that throws is retried with exponential backoff up to
 * `maxRetries` times; if it still fails, the event/error is recorded in
 * `deadLetterQueue` and the subscriber is skipped — it never blocks or
 * fails any other subscriber, and it never fails `publish()` itself.
 *
 * @implements {IEventPublisher}
 */
class EventBus {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxRetries] retries per failing subscriber before dead-lettering (default 3)
   * @param {number} [options.initialDelayMs] base delay before the first retry; doubles each subsequent attempt (default 50)
   */
  constructor({ maxRetries = 3, initialDelayMs = 50 } = {}) {
    this.maxRetries = maxRetries;
    this.initialDelayMs = initialDelayMs;
    /** @type {{ pattern: string, handler: function(DomainEvent): (void|Promise<void>), mode: 'sync'|'async' }[]} */
    this._subscribers = [];
    /** @type {{ event: DomainEvent, error: Error, pattern: string, attempts: number }[]} */
    this._deadLetterQueue = [];
  }

  /**
   * Pre:  `topicPattern` is a non-empty string; `handler` is a function.
   * Post: `handler` is invoked for every future `publish(event)` whose
   *       `event.eventType` matches `topicPattern`. Returns an
   *       unsubscribe function.
   *
   * @param {string} topicPattern
   * @param {function(DomainEvent): (void|Promise<void>)} handler
   * @param {{ mode?: 'sync'|'async' }} [options]
   * @returns {function(): void} unsubscribe
   */
  subscribe(topicPattern, handler, { mode = 'async' } = {}) {
    Guard.againstEmptyString(topicPattern, 'topicPattern');
    Guard.againstNullOrUndefined(handler, 'handler');

    const subscriber = { pattern: topicPattern, handler, mode };
    this._subscribers.push(subscriber);

    return () => {
      this._subscribers = this._subscribers.filter((s) => s !== subscriber);
    };
  }

  /**
   * Pre:  `event` is a DomainEvent (or event-shaped object with a
   *       non-empty `eventType`).
   * Post: every matching subscriber has been invoked (and retried per
   *       its own failures, up to `maxRetries`); a subscriber exhausting
   *       its retries is dead-lettered, not thrown. This method itself
   *       never rejects because of a subscriber failure — only a
   *       malformed `event` argument is a thrown (programmer) error.
   *
   * @param {DomainEvent} event
   * @returns {Promise<void>}
   */
  async publish(event) {
    Guard.againstNullOrUndefined(event, 'event');
    Guard.againstEmptyString(event.eventType, 'event.eventType');

    const matching = this._subscribers.filter((s) => topicMatches(s.pattern, event.eventType));
    const syncSubscribers = matching.filter((s) => s.mode === 'sync');
    const asyncSubscribers = matching.filter((s) => s.mode !== 'sync');

    for (const subscriber of syncSubscribers) {
      await this._runWithRetry(subscriber, event);
    }

    await Promise.all(asyncSubscribers.map((subscriber) => this._runWithRetry(subscriber, event)));
  }

  /**
   * Publishes every event in order, awaiting each before starting the
   * next — the same default behavior IEventPublisher#publishAll
   * documents.
   *
   * @param {DomainEvent[]} events
   * @returns {Promise<void>}
   */
  async publishAll(events) {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * @returns {{ event: DomainEvent, error: Error, pattern: string, attempts: number }[]}
   */
  get deadLetterQueue() {
    return this._deadLetterQueue;
  }

  /**
   * Runs one subscriber's handler for one event, retrying with
   * exponential backoff on failure. Never throws: after the final
   * attempt fails, the failure is recorded in the dead-letter queue and
   * this resolves normally, so one failing subscriber can never block or
   * fail another subscriber (sync or async) or the `publish()` call
   * itself.
   *
   * @param {{ pattern: string, handler: function(DomainEvent): (void|Promise<void>) }} subscriber
   * @param {DomainEvent} event
   * @returns {Promise<void>}
   */
  async _runWithRetry(subscriber, event) {
    let attempt = 0;
    for (;;) {
      try {
        await subscriber.handler(event);
        return;
      } catch (error) {
        attempt += 1;
        if (attempt > this.maxRetries) {
          this._deadLetterQueue.push({ event, error, pattern: subscriber.pattern, attempts: attempt });
          return;
        }
        await delay(this.initialDelayMs * 2 ** (attempt - 1));
      }
    }
  }
}

module.exports = { EventBus };
