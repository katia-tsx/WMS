'use strict';

const { Notification } = require('../entities/Notification');
const { NotificationPreference } = require('../entities/NotificationPreference');

class NotificationDispatchService {
  constructor({ eventBus, channelAdapters = {}, preferenceRepo } = {}) {
    this.eventBus = eventBus;
    this.channelAdapters = channelAdapters; // { IN_APP: adapter, EMAIL: adapter, SMS: adapter }
    this.preferenceRepo = preferenceRepo;

    if (this.eventBus) {
      this._subscribeToDomainEvents();
    }
  }

  _subscribeToDomainEvents() {
    this.eventBus.subscribe('*', async (event) => {
      await this.handleDomainEvent(event);
    });
  }

  async handleDomainEvent(event) {
    const eventType = event.eventType;
    let templateId = 'GENERIC_ALERT';
    let message = `System notification for event: ${eventType}`;
    let recipientId = 'usr-admin';

    if (eventType === 'inventory.low-stock-breached') {
      templateId = 'LOW_STOCK';
      message = `Low Stock Alert: SKU ${event.sku} is down to ${event.currentQuantity} units (threshold: ${event.threshold})`;
    } else if (eventType === 'orders.order-confirmed') {
      templateId = 'ORDER_CONFIRMED';
      message = `Order #${event.orderId} confirmed successfully for customer ${event.customerId}`;
    } else if (eventType === 'shipments.status-changed') {
      templateId = 'SHIPMENT_STATUS';
      message = `Shipment #${event.shipmentId} status updated to ${event.newStatus}`;
    } else if (eventType === 'fleet.maintenance-due') {
      templateId = 'MAINTENANCE_DUE';
      message = `Vehicle Maintenance Due: Vehicle ${event.licensePlate} (${event.reason})`;
    } else if (eventType === 'shipments.delivery-exception') {
      templateId = 'DELIVERY_EXCEPTION';
      message = `Delivery Exception Alert: Shipment #${event.shipmentId} (${event.type}): ${event.description}`;
    }

    const pref = this.preferenceRepo ? await this.preferenceRepo.findByUserId(recipientId) : new NotificationPreference({ userId: recipientId });

    const notificationId = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    for (const [channelKey, adapter] of Object.entries(this.channelAdapters)) {
      if (pref.isChannelEnabled(channelKey) && adapter) {
        const notif = new Notification({
          id: notificationId,
          recipientId,
          channel: channelKey,
          templateId,
          payload: { message, eventType, eventPayload: event.payload },
        });
        await adapter.send(notif);
      }
    }
  }
}

module.exports = { NotificationDispatchService };
