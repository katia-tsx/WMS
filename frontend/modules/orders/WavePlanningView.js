import '../../design-system/index.js';

export class WavePlanningView {
  constructor(container) {
    this.container = container;
    this.selectedOrderIds = new Set(['ORD-8801', 'ORD-8802']);
  }

  mount() {
    this.container.innerHTML = `
      <div class="wave-planning-module" style="font-family: var(--font-sans);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Supervisor Wave Planning &amp; Dispatch</h1>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Group pending orders into optimized picking waves by aisle proximity and picker workload capacity.
            </p>
          </div>
          <div>
            <wms-button id="btn-dispatch-wave" size="sm">🚀 Dispatch Wave (<span id="selected-count">2</span> Orders)</wms-button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          <!-- Order Selection List -->
          <wms-card>
            <span slot="header">Select Pending Orders for Wave</span>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--color-border-default); text-align: left; color: var(--color-text-secondary);">
                  <th style="padding: 8px;"><input type="checkbox" checked /></th>
                  <th style="padding: 8px;">Order ID</th>
                  <th style="padding: 8px;">Customer</th>
                  <th style="padding: 8px;">Items Count</th>
                  <th style="padding: 8px;">Priority Score</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--color-border-subtle);">
                  <td style="padding: 8px;"><input type="checkbox" class="order-chk" data-id="ORD-8801" checked /></td>
                  <td style="padding: 8px; font-family: var(--font-mono);">ORD-8801</td>
                  <td style="padding: 8px;">Acme Logistics</td>
                  <td style="padding: 8px;">14 items</td>
                  <td style="padding: 8px;"><wms-badge variant="primary" size="sm">104 (VIP)</wms-badge></td>
                </tr>
                <tr style="border-bottom: 1px solid var(--color-border-subtle);">
                  <td style="padding: 8px;"><input type="checkbox" class="order-chk" data-id="ORD-8802" checked /></td>
                  <td style="padding: 8px; font-family: var(--font-mono);">ORD-8802</td>
                  <td style="padding: 8px;">Global Cargo Ltd</td>
                  <td style="padding: 8px;">4 items</td>
                  <td style="padding: 8px;"><wms-badge variant="neutral" size="sm">54</wms-badge></td>
                </tr>
              </tbody>
            </table>
          </wms-card>

          <!-- Picker Workload Visualization Bar -->
          <wms-card>
            <span slot="header">Picker Capacity &amp; Workload</span>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                  <span>Picker #1 (John D.)</span>
                  <span>18 / 50 tasks</span>
                </div>
                <div style="height: 8px; background: var(--color-bg-muted); border-radius: 4px; overflow: hidden;">
                  <div style="width: 36%; height: 100%; background: var(--color-success);"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                  <span>Picker #2 (Sarah M.)</span>
                  <span>42 / 50 tasks</span>
                </div>
                <div style="height: 8px; background: var(--color-bg-muted); border-radius: 4px; overflow: hidden;">
                  <div style="width: 84%; height: 100%; background: var(--color-warning);"></div>
                </div>
              </div>
            </div>
          </wms-card>
        </div>
      </div>
    `;

    const dispatchBtn = this.container.querySelector('#btn-dispatch-wave');
    dispatchBtn.addEventListener('click', () => {
      alert(`Picking Wave successfully created and dispatched to Picker #1 using SerpentineRouteStrategy!`);
    });
  }
}
