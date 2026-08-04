'use strict';

/**
 * Notification Entity
 */
class Notification {
  constructor({ id, recipientId, channel = 'IN_APP', templateId, payload = {}, readStatus = 'UNREAD', deliveryStatus = 'PENDING', createdAt = new Date() }) {
    if (!id) throw new Error('Notification requires id');
    if (!recipientId) throw new Error('Notification requires recipientId');

    this.id = id;
    this.recipientId = recipientId;
    this.channel = channel;
    this.templateId = templateId || 'DEFAULT_TEMPLATE';
    this.payload = payload;
    this.readStatus = readStatus;
    this.deliveryStatus = deliveryStatus;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
  }

  markAsRead() {
    this.readStatus = 'READ';
  }

  markDelivered() {
    this.deliveryStatus = 'DELIVERED';
  }
}

module.exports = { Notification };
