'use strict';

const { Port } = require('./Port');

/**
 * INotificationGateway — outbound port for the Notifications bounded
 * context: sending a message to a human through whatever channel a
 * concrete adapter wires up (email, SMS, push, Slack...). No adapter
 * exists yet (domain/notifications is still scaffolded) — this port lets
 * use cases in that context be written and unit-tested against an
 * in-memory fake before any real channel is wired up.
 *
 * @interface
 */
class INotificationGateway extends Port {
  /**
   * Pre:  `notification.recipient` identifies who should receive it (the
   *       concrete shape — email address, phone number, user id — is an
   *       adapter concern); `notification.message` is non-empty.
   * Post: resolves once the notification has been handed to the channel
   *       for delivery. Whether that means "delivered" or "queued" is an
   *       adapter concern (mirrors `IEventPublisher#publish`); a rejected
   *       promise means the channel could not even accept it.
   *
   * @param {Object} notification
   * @param {string} notification.recipient
   * @param {string} notification.message
   * @param {string} [notification.subject]
   * @returns {Promise<void>}
   */
  async send(notification) {
    this._abstract('send');
  }
}

module.exports = { INotificationGateway };
