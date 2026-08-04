import '../../components/wms-timeline.js';
import '../../design-system/index.js';

export class OrderDetailView {
  constructor(container, orderId = 'ORD-8801') {
    this.container = container;
    this.orderId = orderId;
  }

  mount() {
    this.container.innerHTML = `
      <div class="order-detail-module" style="font-family: var(--font-sans);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Order #${this.orderId}</h1>
              <wms-badge variant="primary">CONFIRMED</wms-badge>
            </div>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Customer: Acme Logistics | SLA Tier: <strong style="color: var(--color-primary);">VIP (Score: 104)</strong>
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <wms-button variant="outline" size="sm">Cancel Order</wms-button>
            <wms-button size="sm">Allocate Stock</wms-button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          <!-- Order Line Items -->
          <wms-card>
            <span slot="header">Order Line Items &amp; Allocation Status</span>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--color-border-default); text-align: left; color: var(--color-text-secondary);">
                  <th style="padding: 8px;">Product SKU</th>
                  <th style="padding: 8px;">Qty Requested</th>
                  <th style="padding: 8px;">Allocated Qty</th>
                  <th style="padding: 8px;">Allocation Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--color-border-subtle);">
                  <td style="padding: 8px; font-family: var(--font-mono);">WMS-1001</td>
                  <td style="padding: 8px;">10 units</td>
                  <td style="padding: 8px; font-weight: 600;">10 units</td>
                  <td style="padding: 8px;"><wms-badge variant="success" size="sm">FULLY ALLOCATED</wms-badge></td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-family: var(--font-mono);">WMS-1004</td>
                  <td style="padding: 8px;">4 units</td>
                  <td style="padding: 8px; font-weight: 600; color: var(--color-danger);">0 units</td>
                  <td style="padding: 8px;"><wms-badge variant="danger" size="sm">BACKORDERED</wms-badge></td>
                </tr>
              </tbody>
            </table>
          </wms-card>

          <!-- Order Lifecycle Event History Timeline -->
          <wms-card>
            <span slot="header">Lifecycle Event History</span>
            <wms-timeline id="order-history-timeline"></wms-timeline>
          </wms-card>
        </div>
      </div>
    `;

    const timeline = this.container.querySelector('#order-history-timeline');
    timeline.events = [
      { title: 'Order Created (Draft)', location: 'API Ingestion', timestamp: '2026-08-04 07:10 AM', status: 'COMPLETED' },
      { title: 'Order Confirmed (OrderConfirmedEvent)', location: 'Rules Engine Validated', timestamp: '2026-08-04 07:12 AM', status: 'COMPLETED' },
      { title: 'Stock Allocation Attempt', location: 'OrderAllocationService', timestamp: '2026-08-04 08:30 AM', status: 'IN_PROGRESS' },
    ];
  }
}
