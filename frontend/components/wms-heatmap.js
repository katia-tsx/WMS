import { attachStyles } from '../design-system/utils/styles.js';

// <wms-heatmap>
// Custom Vanilla Web Component rendering SVG Heatmap matrix grid.

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
  .cell { stroke: #ffffff; stroke-width: 2; rx: 4; cursor: pointer; transition: opacity 120ms ease; }
  .cell:hover { opacity: 0.8; }
  .axis-text { fill: var(--color-text-secondary, #52525b); font-size: 10px; }
`;

export class WmsHeatmap extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-heatmap', CSS);

    root.innerHTML = `
      <div class="chart-container">
        <div class="chart-header" id="chart-title">Activity Heatmap</div>
        <svg viewBox="0 0 400 180" id="svg-element"></svg>
      </div>
    `;

    this._matrix = [
      [20, 50, 80, 90, 40],
      [30, 60, 40, 70, 85],
      [10, 40, 95, 30, 60],
    ];
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

  connectedCallback() {
    this.render();
  }

  render() {
    const svg = this.shadowRoot.getElementById('svg-element');
    if (!svg || !this._matrix) return;

    const rows = this._matrix.length;
    const cols = this._matrix[0].length;
    const cellWidth = 60;
    const cellHeight = 40;
    const paddingLeft = 40;

    let svgHtml = '';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = this._matrix[r][c];
        const opacity = val / 100;
        const x = paddingLeft + c * (cellWidth + 4);
        const y = r * (cellHeight + 4) + 10;

        svgHtml += `
          <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="rgba(79, 70, 229, ${opacity})" class="cell">
            <title>Row ${r + 1}, Col ${c + 1}: ${val}%</title>
          </rect>
        `;
      }
    }

    svg.innerHTML = svgHtml;
  }
}

customElements.define('wms-heatmap', WmsHeatmap);
