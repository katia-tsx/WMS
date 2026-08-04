import { attachStyles } from '../design-system/utils/styles.js';

// <wms-line-chart>
// Custom Vanilla Web Component rendering responsive SVG line trend charts.

const CSS = `
  :host {
    display: block;
    font-family: var(--font-sans, sans-serif);
  }
  .chart-container {
    background: var(--color-bg-surface, #ffffff);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-lg, 12px);
    padding: var(--space-4, 16px);
  }
  .chart-header {
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-weight-semibold, 600);
    margin-bottom: var(--space-3, 12px);
  }
  svg {
    width: 100%;
    height: auto;
    max-height: 220px;
  }
  .grid-line { stroke: var(--color-border-subtle, #f4f4f5); stroke-width: 1; }
  .line-path { fill: none; stroke: var(--color-primary, #4f46e5); stroke-width: 3; stroke-linecap: round; }
  .dot { fill: var(--color-primary, #4f46e5); stroke: #ffffff; stroke-width: 2; cursor: pointer; }
  .axis-text { fill: var(--color-text-secondary, #52525b); font-size: 10px; }
`;

export class WmsLineChart extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-line-chart', CSS);

    root.innerHTML = `
      <div class="chart-container">
        <div class="chart-header" id="chart-title">Line Chart</div>
        <svg viewBox="0 0 400 180" id="svg-element"></svg>
      </div>
    `;

    this._data = [20, 35, 45, 30, 60, 75, 90];
    this._labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }

  static get observedAttributes() {
    return ['title'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'title') {
      const titleEl = this.shadowRoot.getElementById('chart-title');
      if (titleEl) titleEl.textContent = newVal;
    }
  }

  set data(values) {
    this._data = values;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const svg = this.shadowRoot.getElementById('svg-element');
    if (!svg || !this._data || this._data.length === 0) return;

    const maxVal = Math.max(...this._data, 100);
    const width = 400;
    const height = 180;
    const padding = 30;

    const points = this._data.map((val, i) => {
      const x = padding + (i / (this._data.length - 1)) * (width - padding * 2);
      const y = height - padding - (val / maxVal) * (height - padding * 2);
      return { x, y, val };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

    let svgHtml = `
      <!-- Horizontal Grid Lines -->
      <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" class="grid-line" />
      <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" class="grid-line" />
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="grid-line" />

      <!-- Polyline -->
      <polyline points="${polylinePoints}" class="line-path" />
    `;

    // Dots and Labels
    points.forEach((p, i) => {
      svgHtml += `
        <circle cx="${p.x}" cy="${p.y}" r="5" class="dot"><title>${this._labels[i] || i}: ${p.val}</title></circle>
        <text x="${p.x}" y="${height - 10}" text-anchor="middle" class="axis-text">${this._labels[i] || ''}</text>
      `;
    });

    svg.innerHTML = svgHtml;
  }
}

customElements.define('wms-line-chart', WmsLineChart);
