import '../../components/wms-line-chart.js';
import '../../components/wms-bar-chart.js';
import '../../components/wms-heatmap.js';
import '../../design-system/index.js';

export class AnalyticsDashboardView {
  constructor(container) {
    this.container = container;
  }

  mount() {
    this.container.innerHTML = `
      <div class="analytics-dashboard-module" style="font-family: var(--font-sans);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Executive Analytics &amp; CQRS Reporting</h1>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Read-model snapshots, cycle time distribution, fleet utilization, and inventory health metrics.
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="date-range-select" style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--color-border-default); background: var(--color-bg-surface); font-size: 0.875rem;">
              <option value="7d">Last 7 Days</option>
              <option value="30d" selected>Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <wms-button id="btn-export-csv" variant="outline" size="sm">📥 Export CSV</wms-button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 16px; border-bottom: 1px solid var(--color-border-default); margin-bottom: 24px;">
          <button class="analytics-tab active" data-tab="tab-ops" style="all: unset; padding: 8px 16px; font-weight: 600; cursor: pointer; border-bottom: 2px solid var(--color-primary);">Operations Overview</button>
          <button class="analytics-tab" data-tab="tab-fleet" style="all: unset; padding: 8px 16px; color: var(--color-text-secondary); cursor: pointer;">Fleet Utilization</button>
          <button class="analytics-tab" data-tab="tab-inventory" style="all: unset; padding: 8px 16px; color: var(--color-text-secondary); cursor: pointer;">Inventory Health</button>
        </div>

        <!-- Tab 1: Operations Overview -->
        <div id="tab-ops" class="analytics-tab-content">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <wms-line-chart title="Warehouse Throughput Trends (Units / Operator Hr)" id="chart-throughput"></wms-line-chart>
            <wms-bar-chart title="Order Cycle Time Distribution (Minutes)" id="chart-cycletime"></wms-bar-chart>
          </div>
        </div>

        <!-- Tab 2: Fleet Utilization -->
        <div id="tab-fleet" class="analytics-tab-content" hidden>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <wms-bar-chart title="Vehicle Active vs Idle Hours" id="chart-fleet-idle"></wms-bar-chart>
            <wms-heatmap title="Route Efficiency Variance Matrix" id="chart-route-heatmap"></wms-heatmap>
          </div>
        </div>

        <!-- Tab 3: Inventory Health -->
        <div id="tab-inventory" class="analytics-tab-content" hidden>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <wms-line-chart title="Turnover Rate Trends (x/yr)" id="chart-turnover"></wms-line-chart>
            <wms-bar-chart title="Dead Stock Value over Time ($)" id="chart-deadstock"></wms-bar-chart>
          </div>
        </div>
      </div>
    `;

    const tabs = this.container.querySelectorAll('.analytics-tab');
    const contents = this.container.querySelectorAll('.analytics-tab-content');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;
        tabs.forEach((t) => {
          t.style.borderBottom = 'none';
          t.style.color = 'var(--color-text-secondary)';
        });
        tab.style.borderBottom = '2px solid var(--color-primary)';
        tab.style.color = 'var(--color-text-primary)';

        contents.forEach((c) => {
          c.hidden = c.id !== targetId;
        });
      });
    });

    this.container.querySelector('#btn-export-csv').addEventListener('click', () => {
      this._exportToCsv();
    });
  }

  _exportToCsv() {
    const csvContent = 'data:text/csv;charset=utf-8,Date,Throughput_Units_Hr,Avg_Cycle_Time_Min,On_Time_Rate\n2026-08-01,112.5,42.0,96.5%\n2026-08-02,118.0,38.5,98.0%\n2026-08-03,124.2,35.0,97.2%';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'wms_analytics_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
