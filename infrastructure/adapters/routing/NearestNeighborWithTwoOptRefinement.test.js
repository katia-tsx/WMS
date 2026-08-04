'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { NearestNeighborWithTwoOptRefinement } = require('./NearestNeighborWithTwoOptRefinement');

describe('NearestNeighborWithTwoOptRefinement VRP Solver Adapter', () => {
  it('optimizes 10 synthetic stops into capacity-respecting routes using 2-opt refinement', async () => {
    const solver = new NearestNeighborWithTwoOptRefinement({ maxTwoOptIterations: 50 });
    const depot = { latitude: 30.0, longitude: -97.0 };
    const stops = Array.from({ length: 10 }, (_, i) => ({
      id: `s-${i + 1}`,
      orderId: `o-${i + 1}`,
      latitude: 30.0 + (i + 1) * 0.01,
      longitude: -97.0 + (i % 2 === 0 ? 0.01 : -0.01),
      demandWeight: 100,
    }));

    const result = await solver.optimize({
      depot,
      stops,
      maxVehicleCapacity: 300, // Should split into 4 routes
    });

    assert.ok(result.routes.length >= 3);
    assert.equal(result.unassignedStops.length, 0);
    assert.ok(result.solverMetrics.totalDistanceKm > 0);
  });
});
