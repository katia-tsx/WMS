'use strict';

const { INotificationChannelAdapter } = require('../../../application/ports/INotificationChannelAdapter');

class SmsNotificationAdapter extends INotificationChannelAdapter {
  constructor() {
    super();
    this.sentSms = [];
  }

  async send(notification) {
    notification.markDelivered();
    this.sentSms.push(notification);
    return true;
  }
}

module.exports = { SmsNotificationAdapter };
