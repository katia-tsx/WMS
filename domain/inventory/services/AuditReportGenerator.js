'use strict';

/**
 * AuditReportGenerator
 * Builds a printable HTML annual audit summary report.
 */
class AuditReportGenerator {
  /**
   * Generates a printable HTML string summarizing an audit reconciliation.
   * @param {Object} params
   * @param {string} params.auditSessionId
   * @param {string} params.warehouseId
   * @param {number} params.totalVarianceValue
   * @param {Object} params.zoneAccuracy
   * @param {Array} params.topDiscrepancies
   * @param {Array} params.results
   * @returns {string} Printable HTML Report String
   */
  static generateHtmlReport({
    auditSessionId,
    warehouseId,
    totalVarianceValue = 0,
    zoneAccuracy = {},
    topDiscrepancies = [],
    results = [],
  }) {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const overallAccuracy =
      Object.values(zoneAccuracy).length > 0
        ? (Object.values(zoneAccuracy).reduce((a, b) => a + b, 0) / Object.values(zoneAccuracy).length).toFixed(1)
        : '100.0';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Annual Physical Inventory Audit Report — ${auditSessionId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #18181b; }
    .header { border-bottom: 2px solid #e4e4e7; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: bold; margin: 0; }
    .subtitle { color: #71717a; font-size: 14px; margin-top: 4px; }
    .metrics-grid { display: flex; gap: 20px; margin-bottom: 32px; }
    .card { flex: 1; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; }
    .card-label { font-size: 12px; color: #71717a; text-transform: uppercase; font-weight: 600; }
    .card-value { font-size: 24px; font-weight: bold; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    th, td { border-bottom: 1px solid #e4e4e7; padding: 10px; text-align: left; }
    th { background: #fafafa; color: #52525b; font-weight: 600; font-size: 12px; text-transform: uppercase; }
    .discrepancy { color: #dc2626; font-weight: 600; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer;">🖨️ Print / Download PDF Report</button>
  </div>

  <div class="header">
    <h1 class="title">Annual Physical Inventory Audit Report</h1>
    <div class="subtitle">Session ID: <strong>${auditSessionId}</strong> | Warehouse: <strong>${warehouseId}</strong> | Date: <strong>${formattedDate}</strong></div>
  </div>

  <div class="metrics-grid">
    <div class="card">
      <div class="card-label">Total Variance Value</div>
      <div class="card-value">$${totalVarianceValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card">
      <div class="card-label">Overall Inventory Accuracy</div>
      <div class="card-value">${overallAccuracy}%</div>
    </div>
    <div class="card">
      <div class="card-label">Total Bins Audited</div>
      <div class="card-value">${results.length}</div>
    </div>
  </div>

  <h2>Zone Accuracy Breakdown</h2>
  <table>
    <thead>
      <tr><th>Zone</th><th>Accuracy Rate</th></tr>
    </thead>
    <tbody>
      ${Object.entries(zoneAccuracy)
        .map(
          ([zone, acc]) => `
        <tr><td><strong>${zone}</strong></td><td>${acc}%</td></tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <h2 style="margin-top: 32px;">Top Inventory Discrepancies</h2>
  <table>
    <thead>
      <tr><th>SKU</th><th>Bin</th><th>Expected</th><th>Reconciled</th><th>Variance Qty</th><th>Variance Value</th></tr>
    </thead>
    <tbody>
      ${topDiscrepancies.length === 0 ? '<tr><td colspan="6">No discrepancies found. Audit matched 100%.</td></tr>' : ''}
      ${topDiscrepancies
        .map(
          (d) => `
        <tr>
          <td><code>${d.sku}</code></td>
          <td>${d.binId}</td>
          <td>${d.expectedCount}</td>
          <td>${d.finalCount}</td>
          <td class="discrepancy">${d.varianceQty > 0 ? `+${d.varianceQty}` : d.varianceQty}</td>
          <td class="discrepancy">$${d.varianceValue.toFixed(2)}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;
  }
}

module.exports = { AuditReportGenerator };
