'use strict';

/**
 * Swappable INotificationChannelAdapter Port Interface
 */
class INotificationChannelAdapter {
  /**
   * Sends a notification through the channel adapter.
   * @param {import('../../domain/notifications/entities/Notification').Notification} notification
   * @returns {Promise<boolean>} Success status
   */
  async send(notification) {
    throw new Error('INotificationChannelAdapter#send must be implemented by subclass');
  }
}

module.exports = { INotificationChannelAdapter };
