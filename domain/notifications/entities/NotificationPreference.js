'use strict';

/**
 * NotificationPreference Entity
 */
class NotificationPreference {
  constructor({ userId, preferences = {} }) {
    if (!userId) throw new Error('NotificationPreference requires userId');

    this.userId = userId;
    this.preferences = {
      IN_APP: true,
      EMAIL: true,
      SMS: false,
      ...preferences,
    };
  }

  isChannelEnabled(channel) {
    return Boolean(this.preferences[channel]);
  }
}

module.exports = { NotificationPreference };
