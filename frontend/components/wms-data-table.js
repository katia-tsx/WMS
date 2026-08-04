import { attachStyles } from '../design-system/utils/styles.js';
import '../design-system/index.js';

// <wms-data-table>
// Features: Virtualized window rendering for large datasets, sticky headers,
// server-side pagination, column sorting, responsive card collapse (<768px),
// first-class loading, empty, and error states.
// Events: wms-row-selected, wms-page-changed, wms-sort-changed, wms-action-clicked

const CSS = `
  :host {
    display: block;
    font-family: var(--font-sans, sans-serif);
    background: var(--color-bg-surface, #ffffff);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-lg, 12px);
    overflow: hidden;
  }

  .table-container {
    width: 100%;
    overflow-x: auto;
    overflow-y: auto;
    max-height: 480px;
    position: relative;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm, 0.8125rem);
    text-align: left;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--color-bg-subtle, #fafafa);
    color: var(--color-text-secondary, #52525b);
    font-weight: var(--font-weight-semibold, 600);
    font-size: var(--text-xs, 0.75rem);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: var(--space-3, 12px) var(--space-4, 16px);
    border-bottom: 1px solid var(--color-border-default, #e4e4e7);
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
  }

  thead th:hover {
    color: var(--color-text-primary, #18181b);
  }

  tbody tr {
    border-bottom: 1px solid var(--color-border-subtle, #f4f4f5);
    transition: background var(--duration-fast, 120ms) ease;
    height: 48px;
  }

  tbody tr:hover {
    background: var(--color-bg-subtle, #fafafa);
  }

  tbody td {
    padding: var(--space-3, 12px) var(--space-4, 16px);
    color: var(--color-text-primary, #18181b);
    vertical-align: middle;
  }

  /* Inline Actions */
  .action-btn {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    font-size: var(--text-xs, 0.75rem);
    border-radius: var(--radius-md, 8px);
    cursor: pointer;
    border: 1px solid var(--color-border-default, #e4e4e7);
    background: var(--color-bg-surface, #ffffff);
    color: var(--color-text-primary, #18181b);
  }

  /* Pagination Bar */
  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3, 12px) var(--space-4, 16px);
    background: var(--color-bg-subtle, #fafafa);
    border-top: 1px solid var(--color-border-default, #e4e4e7);
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-text-secondary, #52525b);
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
  }

  .pagination-btn {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md, 8px);
    border: 1px solid var(--color-border-default, #e4e4e7);
    background: var(--color-bg-surface, #ffffff);
    color: var(--color-text-primary, #18181b);
    cursor: pointer;
  }

  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* State overlays */
  .state-box {
    padding: var(--space-8, 32px);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3, 12px);
    min-height: 240px;
  }

  .state-icon {
    font-size: 2.5rem;
  }

  .state-title {
    font-size: var(--text-base, 0.875rem);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-text-primary, #18181b);
  }

  .state-desc {
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-text-secondary, #52525b);
    max-width: 320px;
  }

  /* Mobile Responsive Cards (<768px) */
  @media (max-width: 767px) {
    .table-container { max-height: none; }
    table, thead, tbody, th, td, tr { display: block; }
    thead { display: none; }
    tbody tr {
      height: auto;
      margin: var(--space-3, 12px);
      padding: var(--space-4, 16px);
      border: 1px solid var(--color-border-default, #e4e4e7);
      border-radius: var(--radius-lg, 12px);
      background: var(--color-bg-surface, #ffffff);
    }
    tbody td {
      display: flex;
      justify-content: space-between;
      padding: var(--space-2, 8px) 0;
      border-bottom: 1px solid var(--color-border-subtle, #f4f4f5);
    }
    tbody td:last-child { border-bottom: none; }
    tbody td::before {
      content: attr(data-label);
      font-weight: var(--font-weight-semibold, 600);
      color: var(--color-text-secondary, #52525b);
    }
  }

  [hidden] { display: none !important; }
`;

export class WmsDataTable extends HTMLElement {
  static get observedAttributes() {
    return ['loading', 'error', 'page', 'page-size', 'total-items'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-data-table', CSS);

    root.innerHTML = `
      <div class="table-container" part="container" id="scroll-container">
        <table part="table">
          <thead id="table-head"></thead>
          <tbody id="table-body"></tbody>
        </table>
        <div class="state-box" id="state-box" hidden></div>
      </div>
      <div class="pagination-bar" part="pagination">
        <span id="page-info">Showing 0-0 of 0 items</span>
        <div class="pagination-controls">
          <button class="pagination-btn" id="prev-page-btn" aria-label="Previous Page">‹</button>
          <span id="page-num">1</span>
          <button class="pagination-btn" id="next-page-btn" aria-label="Next Page">›</button>
        </div>
      </div>
    `;

    this._container = root.getElementById('scroll-container');
    this._headEl = root.getElementById('table-head');
    this._bodyEl = root.getElementById('table-body');
    this._stateBox = root.getElementById('state-box');
    this._pageInfo = root.getElementById('page-info');
    this._pageNum = root.getElementById('page-num');
    this._prevBtn = root.getElementById('prev-page-btn');
    this._nextBtn = root.getElementById('next-page-btn');

    this._columns = [];
    this._data = [];
    this._sortKey = null;
    this._sortDir = 'asc';
    this._rowHeight = 48;
    this._buffer = 5;

    this._onScroll = this._onScroll.bind(this);
    this._container.addEventListener('scroll', this._onScroll);

    this._prevBtn.addEventListener('click', () => this._changePage(-1));
    this._nextBtn.addEventListener('click', () => this._changePage(1));
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  set columns(cols) {
    this._columns = cols || [];
    this._renderHead();
    this._render();
  }
  get columns() { return this._columns; }

  set data(rows) {
    this._data = rows || [];
    this._render();
  }
  get data() { return this._data; }

  get page() { return Number(this.getAttribute('page')) || 1; }
  set page(val) { this.setAttribute('page', String(val)); }

  get pageSize() { return Number(this.getAttribute('page-size')) || 10; }
  set pageSize(val) { this.setAttribute('page-size', String(val)); }

  get totalItems() { return Number(this.getAttribute('total-items')) || this._data.length; }
  set totalItems(val) { this.setAttribute('total-items', String(val)); }

  _changePage(delta) {
    const next = this.page + delta;
    if (next >= 1) {
      this.page = next;
      this.dispatchEvent(new CustomEvent('wms-page-changed', {
        bubbles: true,
        composed: true,
        detail: { page: this.page, pageSize: this.pageSize },
      }));
    }
  }

  _onScroll() {
    this._renderVirtualRows();
  }

  _renderHead() {
    this._headEl.innerHTML = `
      <tr>
        ${this._columns.map((c) => `
          <th data-key="${c.key}">
            ${c.label} ${this._sortKey === c.key ? (this._sortDir === 'asc' ? '↑' : '↓') : ''}
          </th>
        `).join('')}
      </tr>
    `;

    this._headEl.querySelectorAll('th').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (this._sortKey === key) {
          this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._sortKey = key;
          this._sortDir = 'asc';
        }
        this._renderHead();
        this.dispatchEvent(new CustomEvent('wms-sort-changed', {
          bubbles: true,
          composed: true,
          detail: { sortKey: this._sortKey, sortDir: this._sortDir },
        }));
      });
    });
  }

  _render() {
    const isLoading = this.hasAttribute('loading');
    const isError = this.hasAttribute('error');
    const isEmpty = !isLoading && !isError && this._data.length === 0;

    if (isLoading) {
      this._stateBox.removeAttribute('hidden');
      this._stateBox.innerHTML = `
        <wms-skeleton variant="text" lines="3" width="80%"></wms-skeleton>
        <wms-skeleton variant="rect" height="120px" width="100%"></wms-skeleton>
      `;
      this._bodyEl.innerHTML = '';
      return;
    }

    if (isError) {
      this._stateBox.removeAttribute('hidden');
      this._stateBox.innerHTML = `
        <div class="state-icon">⚠️</div>
        <div class="state-title">Failed to load data</div>
        <div class="state-desc">${this.getAttribute('error') || 'An unexpected network error occurred.'}</div>
        <button class="action-btn" id="retry-btn">Retry Request</button>
      `;
      this._stateBox.querySelector('#retry-btn')?.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('wms-retry', { bubbles: true, composed: true }));
      });
      this._bodyEl.innerHTML = '';
      return;
    }

    if (isEmpty) {
      this._stateBox.removeAttribute('hidden');
      this._stateBox.innerHTML = `
        <div class="state-icon">📦</div>
        <div class="state-title">No records found</div>
        <div class="state-desc">No items match your active filters or search criteria.</div>
      `;
      this._bodyEl.innerHTML = '';
      return;
    }

    this._stateBox.setAttribute('hidden', '');
    this._renderVirtualRows();
    this._updatePagination();
  }

  _renderVirtualRows() {
    if (this._data.length === 0) return;

    const scrollTop = this._container.scrollTop;
    const containerHeight = this._container.clientHeight || 400;

    const startIndex = Math.max(0, Math.floor(scrollTop / this._rowHeight) - this._buffer);
    const endIndex = Math.min(this._data.length, Math.ceil((scrollTop + containerHeight) / this._rowHeight) + this._buffer);

    const topSpacerHeight = startIndex * this._rowHeight;
    const bottomSpacerHeight = (this._data.length - endIndex) * this._rowHeight;

    const visibleRows = this._data.slice(startIndex, endIndex);

    let html = `<tr style="height: ${topSpacerHeight}px;"><td colspan="${this._columns.length}"></td></tr>`;

    for (let i = 0; i < visibleRows.length; i++) {
      const row = visibleRows[i];
      html += `
        <tr data-index="${startIndex + i}">
          ${this._columns.map((c) => `
            <td data-label="${c.label}">
              ${c.render ? c.render(row[c.key], row) : (row[c.key] ?? '')}
            </td>
          `).join('')}
        </tr>
      `;
    }

    html += `<tr style="height: ${bottomSpacerHeight}px;"><td colspan="${this._columns.length}"></td></tr>`;

    this._bodyEl.innerHTML = html;

    // Attach row selection listener
    this._bodyEl.querySelectorAll('tr[data-index]').forEach((tr) => {
      tr.addEventListener('click', () => {
        const idx = Number(tr.dataset.index);
        const selected = this._data[idx];
        this.dispatchEvent(new CustomEvent('wms-row-selected', {
          bubbles: true,
          composed: true,
          detail: { row: selected, index: idx },
        }));
      });
    });
  }

  _updatePagination() {
    const page = this.page;
    const pageSize = this.pageSize;
    const total = this.totalItems;

    const start = Math.min((page - 1) * pageSize + 1, total);
    const end = Math.min(page * pageSize, total);

    this._pageInfo.textContent = `Showing ${start}-${end} of ${total} items`;
    this._pageNum.textContent = String(page);
    this._prevBtn.disabled = page <= 1;
    this._nextBtn.disabled = end >= total;
  }
}

customElements.define('wms-data-table', WmsDataTable);
