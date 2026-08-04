'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { Route } = require('../../../domain/routing/entities/Route');
const { RouteStop } = require('../../../domain/routing/entities/RouteStop');
const { Depot } = require('../../../domain/routing/value-objects/Depot');
const { HaversineDistanceCalculator } = require('../../../domain/routing/services/HaversineDistanceCalculator');

const { GenerateOptimizedRoutesUseCase } = require('./GenerateOptimizedRoutesUseCase');
const { ManuallyReorderRouteStopUseCase } = require('./ManuallyReorderRouteStopUseCase');
const { AssignVehicleToRouteUseCase } = require('./AssignVehicleToRouteUseCase');
const { DispatchRouteUseCase } = require('./DispatchRouteUseCase');

class ApplicationMockOptimizationEngine {
  async optimize({ depot, stops }) {
    return {
      routes: [
        {
          routeId: 'route-1',
          vehicleId: 'v-1',
          stops: stops.map((s, idx) => ({ ...s, sequenceNumber: idx + 1 })),
          totalDistanceKm: 15.5,
          totalDurationMinutes: 30,
        },
      ],
      unassignedStops: [],
      solverMetrics: { executionTimeMs: 5, totalDistanceKm: 15.5 },
    };
  }
}

describe('HaversineDistanceCalculator & Domain Entities', () => {
  it('calculates distance between Austin and Dallas correctly', () => {
    const dist = HaversineDistanceCalculator.calculateDistanceKm(30.2672, -97.7431, 32.7767, -96.797);
    assert.ok(dist > 280 && dist < 320);

    const driveMins = HaversineDistanceCalculator.estimateDriveTimeMinutes(dist, 100);
    assert.ok(driveMins > 150 && driveMins < 200);
  });

  it('Route entity recalculates metrics on stop resequencing', () => {
    const depot = new Depot({ latitude: 30.0, longitude: -97.0 });
    const route = new Route({
      id: 'r1',
      depot,
      stops: [
        new RouteStop({ id: 's1', latitude: 30.1, longitude: -97.0 }),
        new RouteStop({ id: 's2', latitude: 30.2, longitude: -97.0 }),
      ],
    });

    route.recalculateRouteMetrics();
    assert.ok(route.totalDistanceKm > 0);

    // Swap order
    route.resequenceStops([route.stops[1], route.stops[0]]);
    assert.equal(route.stops[0].id, 's2');
    assert.equal(route.stops[0].sequenceNumber, 1);
  });
});

describe('Routing Use Cases', () => {
  it('executes full VRP route generation, manual stop reordering, vehicle assignment, and dispatch', async () => {
    const routesMap = new Map();
    const mockRepo = {
      save: async (r) => routesMap.set(r.id, r),
      findById: async (id) => routesMap.get(id),
    };
    const mockEngine = new ApplicationMockOptimizationEngine();

    const genUseCase = new GenerateOptimizedRoutesUseCase({ routeRepository: mockRepo, optimizationEngine: mockEngine });
    const reorderUseCase = new ManuallyReorderRouteStopUseCase({ routeRepository: mockRepo });
    const assignUseCase = new AssignVehicleToRouteUseCase({ routeRepository: mockRepo });
    const dispatchUseCase = new DispatchRouteUseCase({ routeRepository: mockRepo });

    const depot = { latitude: 30.0, longitude: -97.0 };
    const stops = [
      { id: 'st1', orderId: 'o1', latitude: 30.05, longitude: -97.05, demandWeight: 50 },
      { id: 'st2', orderId: 'o2', latitude: 30.1, longitude: -97.1, demandWeight: 50 },
    ];

    const genRes = await genUseCase.execute({ depot, stops, maxVehicleCapacity: 500 });
    assert.ok(genRes.routes.length > 0);

    const rId = genRes.routes[0].id;
    await assignUseCase.execute({ routeId: rId, vehicleId: 'veh-99', driverId: 'drv-1' });

    const reorderRes = await reorderUseCase.execute({
      routeId: rId,
      newOrderedStops: [genRes.routes[0].stops[1], genRes.routes[0].stops[0]],
    });
    assert.equal(reorderRes.stops[0].id, 'st2');

    const dispatchRes = await dispatchUseCase.execute({ routeId: rId });
    assert.equal(dispatchRes.status, 'DISPATCHED');
  });
});
