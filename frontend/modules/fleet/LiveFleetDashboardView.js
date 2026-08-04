import '../../design-system/index.js';

export class LiveFleetDashboardView {
  constructor(container) {
    this.container = container;
    this.simProgress = 0.4;
  }

  mount() {
    this.container.innerHTML = `
      <div class="live-fleet-module" style="font-family: var(--font-sans);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Live Fleet Tracking &amp; Route Simulation</h1>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Real-time vehicle marker interpolation, route status monitoring, and historical replay scrubber.
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <wms-button id="btn-toggle-sim" size="sm" variant="secondary">▶ Start Live Simulation</wms-button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2.2fr 1fr; gap: 24px;">
          <!-- Live Fleet Map View -->
          <div>
            <wms-card>
              <span slot="header">Active Fleet Map &amp; Real-Time Telemetry</span>
              <div style="background: #0f172a; border-radius: 8px; padding: 16px; position: relative; overflow: hidden; height: 320px;">
                <svg viewBox="0 0 500 280" style="width: 100%; height: 100%;">
                  <!-- Route Polyline (Green = On Time) -->
                  <polyline points="40,240 180,140 320,100 440,200" fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round" />
                  
                  <!-- Planned Route Ghost Line -->
                  <polyline points="40,240 160,150 320,100 440,200" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="4" />

                  <!-- Depot Pin -->
                  <circle cx="40" cy="240" r="8" fill="#4f46e5" />
                  <text x="40" y="265" text-anchor="middle" fill="#fff" font-size="10">Depot</text>

                  <!-- Delivery Stops -->
                  <circle cx="180" cy="140" r="6" fill="#10b981" />
                  <text x="180" y="125" text-anchor="middle" fill="#fff" font-size="10">Stop #1 (10:15 AM)</text>

                  <circle cx="320" cy="100" r="6" fill="#f59e0b" />
                  <text x="320" y="85" text-anchor="middle" fill="#fff" font-size="10">Stop #2 (AT RISK)</text>

                  <circle cx="440" cy="200" r="6" fill="#10b981" />

                  <!-- Animated Vehicle Truck Marker -->
                  <g id="truck-marker" style="transition: transform 0.8s ease-in-out; transform: translate(110px, 190px);">
                    <circle r="14" fill="#3b82f6" opacity="0.3" />
                    <circle r="8" fill="#3b82f6" />
                    <text y="3" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">🚚</text>
                  </g>
                </svg>

                <!-- Map Legend -->
                <div style="position: absolute; bottom: 12px; left: 12px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; color: #fff; display: flex; gap: 12px;">
                  <span style="color: #10b981;">● On-Time Route</span>
                  <span style="color: #f59e0b;">● At-Risk (Minor Delay)</span>
                  <span style="color: #ef4444;">● Delayed</span>
                </div>
              </div>
            </wms-card>

            <!-- Historical Route Replay Scrubber -->
            <wms-card style="margin-top: 16px;">
              <span slot="header">Historical Route Replay Scrubber</span>
              <div style="display: flex; align-items: center; gap: 16px;">
                <wms-button id="btn-play-pause" size="sm" variant="outline">▶ Play</wms-button>
                <input type="range" id="replay-slider" min="0" max="100" value="40" style="flex: 1; accent-color: var(--color-primary);" />
                <span id="replay-time" style="font-family: var(--font-mono); font-size: 0.875rem;">10:18 AM</span>
              </div>
            </wms-card>
          </div>

          <!-- Side Panel Active Routes & Countdown -->
          <div>
            <wms-card>
              <span slot="header">Active Routes &amp; Live ETAs</span>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="padding: 12px; border-radius: 8px; background: var(--color-bg-subtle); border-left: 4px solid var(--color-success);">
                  <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.875rem;">
                    <span>Route #1 (Van A-102)</span>
                    <wms-badge variant="success" size="sm">ON TIME</wms-badge>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px;">
                    Next Stop: Stop #1 (Downtown Market)
                  </div>
                  <div style="font-size: 0.875rem; font-weight: 700; color: var(--color-primary); margin-top: 6px;">
                    ETA: 12 mins (10:30 AM)
                  </div>
                </div>

                <div style="padding: 12px; border-radius: 8px; background: var(--color-bg-subtle); border-left: 4px solid var(--color-warning);">
                  <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.875rem;">
                    <span>Route #2 (Truck B-204)</span>
                    <wms-badge variant="warning" size="sm">AT RISK</wms-badge>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px;">
                    Next Stop: Stop #2 (North Austin)
                  </div>
                  <div style="font-size: 0.875rem; font-weight: 700; color: var(--color-warning); margin-top: 6px;">
                    ETA: +8 mins delay
                  </div>
                </div>
              </div>
            </wms-card>
          </div>
        </div>
      </div>
    `;

    const slider = this.container.querySelector('#replay-slider');
    const marker = this.container.querySelector('#truck-marker');
    const playBtn = this.container.querySelector('#btn-play-pause');

    slider.addEventListener('input', (e) => {
      const val = e.target.value;
      const x = 40 + (val / 100) * 400;
      const y = 240 - Math.sin((val / 100) * Math.PI) * 120;
      marker.style.transform = `translate(${x}px, ${y}px)`;
    });

    let playing = false;
    let timer = null;

    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';

      if (playing) {
        timer = setInterval(() => {
          let v = parseInt(slider.value, 10) + 2;
          if (v > 100) v = 0;
          slider.value = v;
          slider.dispatchEvent(new Event('input'));
        }, 300);
      } else {
        clearInterval(timer);
      }
    });
  }
}
