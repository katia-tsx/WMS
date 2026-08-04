import { InventoryStore } from '../../core/stores/InventoryStore.js';
import '../../components/wms-data-table.js';
import '../../components/wms-filter-bar.js';
import '../../components/wms-location-map.js';
import '../../design-system/index.js';

/**
 * InventoryView
 * Main Inventory module frontend view featuring:
 * - KPI card grid with sparklines (Turnover, Stockouts, Carrying Cost)
 * - Filter bar & virtualized data table
 * - Real-time stock subscription (optimistic UI update)
 * - Annual Audit Session launcher
 */
export class InventoryView {
  constructor(container) {
    this.container = container;
    this._unsubscribeStore = null;
  }

  mount() {
    this.container.innerHTML = `
      <div class="inventory-module">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Stock & Inventory Management</h1>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Live stock levels, zone heatmap occupancy, and real-time reconciliation.
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <wms-button id="btn-annual-audit" variant="danger" size="sm">🔒 Launch Annual Audit</wms-button>
            <wms-button id="btn-new-item" size="sm">+ Add Product SKU</wms-button>
          </div>
        </div>

        <!-- KPI Grid with Sparkline Indicators -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <wms-card>
            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Inventory Turnover</div>
            <div style="font-size: 1.5rem; font-weight: 700; margin-top: 4px;">5.2x / yr</div>
            <svg width="100" height="24" style="margin-top: 8px;">
              <polyline fill="none" stroke="var(--color-success)" stroke-width="2" points="0,20 25,18 50,14 75,10 100,4"></polyline>
            </svg>
          </wms-card>

          <wms-card>
            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Stockout Incidents</div>
            <div style="font-size: 1.5rem; font-weight: 700; margin-top: 4px;">2</div>
            <svg width="100" height="24" style="margin-top: 8px;">
              <polyline fill="none" stroke="var(--color-danger)" stroke-width="2" points="0,4 25,8 50,12 75,18 100,20"></polyline>
            </svg>
          </wms-card>

          <wms-card>
            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Carrying Cost Estimate</div>
            <div style="font-size: 1.5rem; font-weight: 700; margin-top: 4px;">$4,850</div>
            <svg width="100" height="24" style="margin-top: 8px;">
              <polyline fill="none" stroke="var(--color-primary)" stroke-width="2" points="0,18 25,15 50,12 75,10 100,8"></polyline>
            </svg>
          </wms-card>
        </div>

        <!-- Zone Utilization Heatmap Map -->
        <div style="margin-bottom: 24px;">
          <wms-location-map id="inventory-zone-map"></wms-location-map>
        </div>

        <!-- Filter Bar & Stock List -->
        <wms-filter-bar id="inventory-filter-bar">
          <wms-input id="stock-search-input" size="sm" placeholder="Search SKU or Product Name..."></wms-input>
        </wms-filter-bar>

        <wms-data-table id="inventory-data-table"></wms-data-table>
      </div>
    `;

    this._tableEl = this.container.querySelector('#inventory-data-table');
    this._filterBarEl = this.container.querySelector('#inventory-filter-bar');
    this._searchInput = this.container.querySelector('#stock-search-input');

    this._setupTableColumns();
    this._renderStoreData();

    // Subscribe to store updates (Optimistic UI updates)
    this._unsubscribeStore = InventoryStore.subscribe(() => this._renderStoreData());

    this._searchInput.addEventListener('input', (e) => {
      this._filterBarEl.setFilter('search', e.target.value, `Search: "${e.target.value}"`);
    });

    this._filterBarEl.addEventListener('wms-filter-changed', (e) => {
      const search = e.detail.filters.search?.value.toLowerCase() || '';
      const allItems = InventoryStore.getState().items;
      if (!search) {
        this._tableEl.data = allItems;
      } else {
        this._tableEl.data = allItems.filter((i) => i.sku.toLowerCase().includes(search) || i.name.toLowerCase().includes(search));
      }
    });

    this.container.querySelector('#btn-annual-audit').addEventListener('click', () => {
      alert('Launching Annual Physical Inventory Audit Session... Warehouse is now FROZEN.');
    });
  }

  unmount() {
    if (this._unsubscribeStore) this._unsubscribeStore();
  }

  _setupTableColumns() {
    this._tableEl.columns = [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Product Name' },
      { key: 'category', label: 'Category' },
      { key: 'quantity', label: 'Qty' },
      { key: 'bin', label: 'Bin' },
      {
        key: 'status',
        label: 'Status',
        render: (val) => {
          const v = val === 'IN_STOCK' ? 'success' : val === 'LOW_STOCK' ? 'warning' : 'danger';
          return `<wms-badge variant="${v}" size="sm" dot>${val}</wms-badge>`;
        },
      },
    ];
  }

  _renderStoreData() {
    const state = InventoryStore.getState();
    this._tableEl.data = state.items;
  }
}
