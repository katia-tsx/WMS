'use strict';

const { INotificationChannelAdapter } = require('../../../application/ports/INotificationChannelAdapter');

class EmailNotificationAdapter extends INotificationChannelAdapter {
  constructor() {
    super();
    this.sentEmails = [];
  }

  async send(notification) {
    notification.markDelivered();
    this.sentEmails.push(notification);
    return true;
  }
}

module.exports = { EmailNotificationAdapter };
