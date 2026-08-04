import '../../components/wms-timeline.js';
import '../../design-system/index.js';

export class ProductDetailView {
  constructor(container, sku = 'WMS-1001') {
    this.container = container;
    this.sku = sku;
  }

  mount() {
    this.container.innerHTML = `
      <div class="product-detail-view" style="font-family: var(--font-sans);">
        <!-- Product Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Standard Pallet Box</h1>
              <wms-badge variant="primary">${this.sku}</wms-badge>
            </div>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Category: Packaging | Total Quantity: 240 units
            </p>
          </div>
          <div>
            <wms-button variant="outline" size="sm">Adjust Stock</wms-button>
            <wms-button size="sm">Transfer Stock</wms-button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 16px; border-bottom: 1px solid var(--color-border-default); margin-bottom: 24px;" id="detail-tabs">
          <button class="tab-btn active" data-tab="tab-location" style="all: unset; padding: 8px 16px; font-weight: 600; cursor: pointer; border-bottom: 2px solid var(--color-primary);">Stock by Location</button>
          <button class="tab-btn" data-tab="tab-history" style="all: unset; padding: 8px 16px; color: var(--color-text-secondary); cursor: pointer;">Movement History</button>
          <button class="tab-btn" data-tab="tab-reorder" style="all: unset; padding: 8px 16px; color: var(--color-text-secondary); cursor: pointer;">Reorder & Forecast</button>
        </div>

        <!-- Tab 1: Stock by Location -->
        <div id="tab-location" class="tab-content">
          <wms-card>
            <span slot="header">Bin Allocations</span>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--color-border-default); text-align: left; color: var(--color-text-secondary);">
                  <th style="padding: 8px;">Bin ID</th>
                  <th style="padding: 8px;">Zone</th>
                  <th style="padding: 8px;">Quantity</th>
                  <th style="padding: 8px;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--color-border-subtle);">
                  <td style="padding: 8px; font-family: var(--font-mono);">A1-02-C</td>
                  <td style="padding: 8px;">Zone A</td>
                  <td style="padding: 8px; font-weight: 600;">180 units</td>
                  <td style="padding: 8px;"><wms-badge variant="success" size="sm">PRIMARY</wms-badge></td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-family: var(--font-mono);">B2-04-A</td>
                  <td style="padding: 8px;">Zone B</td>
                  <td style="padding: 8px; font-weight: 600;">60 units</td>
                  <td style="padding: 8px;"><wms-badge variant="neutral" size="sm">OVERFLOW</wms-badge></td>
                </tr>
              </tbody>
            </table>
          </wms-card>
        </div>

        <!-- Tab 2: Movement History Timeline -->
        <div id="tab-history" class="tab-content" hidden>
          <wms-card>
            <span slot="header">Stock Movement Log</span>
            <wms-timeline id="product-timeline"></wms-timeline>
          </wms-card>
        </div>

        <!-- Tab 3: Reorder Settings & Demand Forecast -->
        <div id="tab-reorder" class="tab-content" hidden>
          <wms-card>
            <span slot="header">Demand Forecasting & Reorder Parameters</span>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
              <div>
                <p style="font-size: 0.875rem; color: var(--color-text-secondary);">Reorder Point: <strong>50 units</strong></p>
                <p style="font-size: 0.875rem; color: var(--color-text-secondary);">Optimal Batch Quantity: <strong>200 units</strong></p>
                <p style="font-size: 0.875rem; color: var(--color-text-secondary);">Supplier Lead Time: <strong>4 days</strong></p>
              </div>
              <div style="background: var(--color-bg-subtle); padding: 16px; border-radius: 8px;">
                <h4 style="margin: 0 0 8px; font-size: 0.875rem;">Exponential Smoothing Forecast</h4>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-primary);">148 units / month</div>
                <p style="font-size: 0.75rem; color: var(--color-text-tertiary); margin-top: 4px;">Confidence Interval: ±4.2%</p>
              </div>
            </div>
          </wms-card>
        </div>
      </div>
    `;

    // Populate timeline data
    const timeline = this.container.querySelector('#product-timeline');
    timeline.events = [
      { title: 'Stock Receipt +100 units', location: 'Bin A1-02-C', timestamp: '2026-08-03 09:15 AM', status: 'COMPLETED' },
      { title: 'Stock Reservation -20 units for Order #8801', location: 'Bin A1-02-C', timestamp: '2026-08-03 02:40 PM', status: 'COMPLETED' },
      { title: 'Internal Transfer 60 units -> Zone B', location: 'Bin B2-04-A', timestamp: '2026-08-04 08:00 AM', status: 'IN_PROGRESS' },
    ];

    // Tab switcher logic
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    const tabContents = this.container.querySelectorAll('.tab-content');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.tab;
        tabBtns.forEach((b) => {
          b.style.borderBottom = 'none';
          b.style.color = 'var(--color-text-secondary)';
        });
        btn.style.borderBottom = '2px solid var(--color-primary)';
        btn.style.color = 'var(--color-text-primary)';

        tabContents.forEach((c) => {
          c.hidden = c.id !== targetId;
        });
      });
    });
  }
}
