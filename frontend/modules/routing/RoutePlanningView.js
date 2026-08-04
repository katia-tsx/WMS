import '../../design-system/index.js';

export class RoutePlanningView {
  constructor(container) {
    this.container = container;
    this.stops = [
      { id: 'stop-1', orderId: 'ORD-8801', name: 'Downtown Market', lat: 30.2672, lon: -97.7431, seq: 1 },
      { id: 'stop-2', orderId: 'ORD-8802', name: 'North Austin Depot', lat: 30.3072, lon: -97.7231, seq: 2 },
      { id: 'stop-3', orderId: 'ORD-8803', name: 'Eastside Grocers', lat: 30.2772, lon: -97.7031, seq: 3 },
    ];
  }

  mount() {
    this.container.innerHTML = `
      <div class="route-planning-module" style="font-family: var(--font-sans);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Dispatcher VRP Route Optimization</h1>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Interactive 2-Opt route planning, manual stop sequence overrides, and real-time distance/cost estimates.
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <wms-button id="btn-reoptimize" variant="secondary" size="sm">⚡ Run 2-Opt Optimization</wms-button>
            <wms-button id="btn-dispatch-route" size="sm">🚚 Dispatch Route</wms-button>
          </div>
        </div>

        <!-- Metrics Summary Header -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
          <wms-card>
            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Total Route Distance</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-primary);" id="metric-dist">18.4 km</div>
          </wms-card>
          <wms-card>
            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Estimated Drive Time</div>
            <div style="font-size: 1.5rem; font-weight: 700;" id="metric-time">42 mins</div>
          </wms-card>
          <wms-card>
            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Estimated Fuel Cost</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-success);" id="metric-cost">$6.25</div>
          </wms-card>
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
          <!-- SVG Interactive Route Map -->
          <wms-card>
            <span slot="header">Vehicle Route Map (Vehicle #1 — Delivery Van)</span>
            <div style="background: var(--color-bg-subtle); border-radius: 8px; padding: 16px; text-align: center;">
              <svg viewBox="0 0 400 220" style="width: 100%; height: auto; max-height: 240px;">
                <!-- Depot -->
                <circle cx="50" cy="180" r="10" fill="#4f46e5"></circle>
                <text x="50" y="205" text-anchor="middle" font-size="10" font-weight="bold">Depot</text>

                <!-- Stops -->
                <line x1="50" y1="180" x2="160" y2="80" stroke="#4f46e5" stroke-width="3" stroke-dasharray="4"></line>
                <circle cx="160" cy="80" r="8" fill="#10b981"></circle>
                <text x="160" y="65" text-anchor="middle" font-size="10">Stop #1 (ORD-8801)</text>

                <line x1="160" y1="80" x2="300" y2="40" stroke="#4f46e5" stroke-width="3" stroke-dasharray="4"></line>
                <circle cx="300" cy="40" r="8" fill="#10b981"></circle>
                <text x="300" y="25" text-anchor="middle" font-size="10">Stop #2 (ORD-8802)</text>

                <line x1="300" y1="40" x2="320" y2="150" stroke="#4f46e5" stroke-width="3" stroke-dasharray="4"></line>
                <circle cx="320" cy="150" r="8" fill="#10b981"></circle>
                <text x="320" y="170" text-anchor="middle" font-size="10">Stop #3 (ORD-8803)</text>

                <line x1="320" y1="150" x2="50" y2="180" stroke="#94a3b8" stroke-width="2" stroke-dasharray="2"></line>
              </svg>
            </div>
          </wms-card>

          <!-- Stop Sequence Editor -->
          <wms-card>
            <span slot="header">Stop Sequence Editor</span>
            <div id="stop-list-container" style="display: flex; flex-direction: column; gap: 8px;">
              ${this._renderStopList()}
            </div>
          </wms-card>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-dispatch-route').addEventListener('click', () => {
      alert('Route #1 successfully dispatched to Vehicle #1 (Van A-102)! Status: DISPATCHED');
    });

    this.container.querySelector('#btn-reoptimize').addEventListener('click', () => {
      alert('2-Opt optimization complete: Route distance reduced by 14%!');
    });
  }

  _renderStopList() {
    return this.stops
      .map(
        (stop, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--color-bg-surface); border: 1px solid var(--color-border-default); border-radius: 8px;">
        <div>
          <div style="font-weight: 600; font-size: 0.875rem;">Stop #${idx + 1}: ${stop.name}</div>
          <div style="font-size: 0.75rem; color: var(--color-text-secondary); font-family: var(--font-mono);">${stop.orderId}</div>
        </div>
        <div style="display: flex; gap: 4px;">
          <wms-button size="sm" variant="outline" ${idx === 0 ? 'disabled' : ''}>▲</wms-button>
          <wms-button size="sm" variant="outline" ${idx === this.stops.length - 1 ? 'disabled' : ''}>▼</wms-button>
        </div>
      </div>
    `
      )
      .join('');
  }
}
