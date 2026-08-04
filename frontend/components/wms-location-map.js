import { attachStyles } from '../design-system/utils/styles.js';

// <wms-location-map>
// SVG-based Heatmap Grid rendering warehouse zone occupancy and utilization percentage.

const CSS = `
  :host {
    display: block;
    font-family: var(--font-sans, sans-serif);
  }

  .map-container {
    background: var(--color-bg-surface, #ffffff);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-lg, 12px);
    padding: var(--space-4, 16px);
  }

  .map-title {
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-weight-semibold, 600);
    margin-bottom: var(--space-3, 12px);
  }

  svg {
    width: 100%;
    height: auto;
    max-height: 280px;
  }

  .zone-rect {
    stroke: var(--color-border-default, #e4e4e7);
    stroke-width: 2;
    transition: opacity var(--duration-fast, 120ms) ease;
    cursor: pointer;
  }
  .zone-rect:hover { opacity: 0.85; }

  .zone-label {
    fill: var(--color-text-primary, #18181b);
    font-size: 12px;
    font-weight: 600;
  }

  .zone-sub {
    fill: var(--color-text-secondary, #52525b);
    font-size: 10px;
  }
`;

export class WmsLocationMap extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-location-map', CSS);

    root.innerHTML = `
      <div class="map-container" part="container">
        <div class="map-title">Warehouse Zone Utilization Heatmap</div>
        <svg viewBox="0 0 500 240" part="svg">
          <!-- Zone A -->
          <rect class="zone-rect" x="10" y="10" width="230" height="105" rx="8" fill="rgba(79, 70, 229, 0.85)" data-zone="Zone A"></rect>
          <text class="zone-label" x="25" y="35" fill="#fff">Zone A — High Bay Rack</text>
          <text class="zone-sub" x="25" y="55" fill="#fff">Utilization: 85% (170/200 bins)</text>

          <!-- Zone B -->
          <rect class="zone-rect" x="260" y="10" width="230" height="105" rx="8" fill="rgba(239, 68, 68, 0.90)" data-zone="Zone B"></rect>
          <text class="zone-label" x="275" y="35" fill="#fff">Zone B — Bulk Storage</text>
          <text class="zone-sub" x="275" y="55" fill="#fff">Utilization: 94% (Near Capacity)</text>

          <!-- Zone C -->
          <rect class="zone-rect" x="10" y="125" width="230" height="105" rx="8" fill="rgba(16, 185, 129, 0.40)" data-zone="Zone C"></rect>
          <text class="zone-label" x="25" y="150">Zone C — Cold Storage</text>
          <text class="zone-sub" x="25" y="170">Utilization: 40% (40/100 bins)</text>

          <!-- Zone D -->
          <rect class="zone-rect" x="260" y="125" width="230" height="105" rx="8" fill="rgba(79, 70, 229, 0.60)" data-zone="Zone D"></rect>
          <text class="zone-label" x="275" y="150">Zone D — Staging & Dock</text>
          <text class="zone-sub" x="275" y="170">Utilization: 60% (60/100 bins)</text>
        </svg>
      </div>
    `;

    root.querySelectorAll('.zone-rect').forEach((rect) => {
      rect.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('wms-zone-selected', {
          bubbles: true,
          composed: true,
          detail: { zone: rect.dataset.zone },
        }));
      });
    });
  }
}

customElements.define('wms-location-map', WmsLocationMap);
