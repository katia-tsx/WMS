import { attachStyles } from '../design-system/utils/styles.js';

// <wms-bar-chart>
// Custom Vanilla Web Component rendering responsive SVG bar and stacked bar charts.

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
  .bar { fill: var(--color-primary, #4f46e5); rx: 4; transition: opacity 120ms ease; cursor: pointer; }
  .bar:hover { opacity: 0.85; }
  .bar-stacked { fill: var(--color-warning, #f59e0b); rx: 4; }
  .axis-text { fill: var(--color-text-secondary, #52525b); font-size: 10px; }
`;

export class WmsBarChart extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-bar-chart', CSS);

    root.innerHTML = `
      <div class="chart-container">
        <div class="chart-header" id="chart-title">Bar Chart</div>
        <svg viewBox="0 0 400 180" id="svg-element"></svg>
      </div>
    `;

    this._data = [45, 60, 80, 50, 95];
    this._labels = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
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
    const padding = 35;

    const barWidth = (width - padding * 2) / this._data.length - 12;

    let svgHtml = '';

    this._data.forEach((val, i) => {
      const x = padding + i * (barWidth + 12);
      const barHeight = (val / maxVal) * (height - padding * 2);
      const y = height - padding - barHeight;

      svgHtml += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" class="bar">
          <title>${this._labels[i] || i}: ${val}</title>
        </rect>
        <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" class="axis-text">${this._labels[i] || ''}</text>
      `;
    });

    svg.innerHTML = svgHtml;
  }
}

customElements.define('wms-bar-chart', WmsBarChart);
