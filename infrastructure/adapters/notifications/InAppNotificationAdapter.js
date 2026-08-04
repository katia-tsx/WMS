'use strict';

const { INotificationChannelAdapter } = require('../../../application/ports/INotificationChannelAdapter');

class InAppNotificationAdapter extends INotificationChannelAdapter {
  constructor() {
    super();
    this.inAppStore = [];
  }

  async send(notification) {
    notification.markDelivered();
    this.inAppStore.push(notification);
    return true;
  }

  getNotificationsForUser(userId) {
    return this.inAppStore.filter((n) => n.recipientId === userId);
  }
}

module.exports = { InAppNotificationAdapter };
