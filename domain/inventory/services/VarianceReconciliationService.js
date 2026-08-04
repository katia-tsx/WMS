'use strict';

/**
 * VarianceReconciliationService
 * Compares independent blind count entries, resolves matching counts,
 * escalates conflicting counts to a 3rd recount, and calculates variance metrics.
 */
class VarianceReconciliationService {
  /**
   * Reconciles all count entries for an audit session against expected system stock levels.
   * @param {AuditCountEntry[]} countEntries
   * @param {Array<{ binId: string, sku: string, expectedCount: number, unitPrice: number, zone: string }>} expectedStock
   */
  static reconcile(countEntries, expectedStock = []) {
    const expectedMap = new Map();
    for (const exp of expectedStock) {
      const key = `${exp.binId}:${exp.sku}`;
      expectedMap.set(key, exp);
    }

    // Group count entries by (binId:sku)
    const grouped = new Map();
    for (const entry of countEntries) {
      const key = `${entry.binId}:${entry.sku}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entry);
    }

    const results = [];
    let totalVarianceValue = 0;
    const zoneCounts = new Map(); // zone -> { total: 0, accurate: 0 }

    // Evaluate each expected bin/SKU pair
    for (const [key, exp] of expectedMap.entries()) {
      const entries = grouped.get(key) || [];
      const zone = exp.zone || 'Zone-Default';

      if (!zoneCounts.has(zone)) zoneCounts.set(zone, { total: 0, accurate: 0 });
      const zStats = zoneCounts.get(zone);
      zStats.total++;

      let status = 'RECONCILED';
      let finalCount = exp.expectedCount;
      let recountNeeded = false;

      const recountEntry = entries.find((e) => e.isRecount);
      if (recountEntry) {
        finalCount = recountEntry.count;
        status = 'RECONCILED_VIA_RECOUNT';
      } else if (entries.length >= 2) {
        const count1 = entries[0].count;
        const count2 = entries[1].count;
        if (count1 === count2) {
          finalCount = count1;
          status = 'RECONCILED';
        } else {
          status = 'NEEDS_RECOUNT';
          recountNeeded = true;
        }
      } else if (entries.length === 1) {
        finalCount = entries[0].count;
      }

      const varianceQty = finalCount - exp.expectedCount;
      const varianceVal = Math.abs(varianceQty) * (exp.unitPrice || 10);
      if (status !== 'NEEDS_RECOUNT') {
        totalVarianceValue += varianceVal;
        if (varianceQty === 0) zStats.accurate++;
      }

      results.push({
        binId: exp.binId,
        sku: exp.sku,
        expectedCount: exp.expectedCount,
        finalCount,
        varianceQty,
        varianceValue: varianceVal,
        status,
        recountNeeded,
        zone,
      });
    }

    // Calculate zone accuracy percentages
    const zoneAccuracy = {};
    for (const [z, stats] of zoneCounts.entries()) {
      zoneAccuracy[z] = stats.total > 0 ? Number(((stats.accurate / stats.total) * 100).toFixed(1)) : 100;
    }

    // Top discrepancy SKUs
    const topDiscrepancies = [...results]
      .filter((r) => r.varianceQty !== 0)
      .sort((a, b) => b.varianceValue - a.varianceValue)
      .slice(0, 5);

    return {
      results,
      totalVarianceValue,
      topDiscrepancies,
      zoneAccuracy,
      hasPendingRecounts: results.some((r) => r.recountNeeded),
    };
  }
}

module.exports = { VarianceReconciliationService };
