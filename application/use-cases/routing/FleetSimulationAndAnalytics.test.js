'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { Route } = require('../../../domain/routing/entities/Route');
const { RouteStop } = require('../../../domain/routing/entities/RouteStop');
const { Depot } = require('../../../domain/routing/value-objects/Depot');

const { RouteSimulationService } = require('../../../domain/routing/services/RouteSimulationService');
const { VehiclePositionUpdatedEvent } = require('../../../domain/routing/events/VehiclePositionUpdatedEvent');
const { CalculateRouteEfficiencyUseCase } = require('./CalculateRouteEfficiencyUseCase');

describe('RouteSimulationService & IVehicleLocationSource', () => {
  it('interpolates vehicle position and emits VehiclePositionUpdatedEvent', async () => {
    const publishedEvents = [];
    const mockEventPublisher = {
      publish: async (evt) => publishedEvents.push(evt),
    };
    const mockClock = { now: () => new Date('2026-08-04T10:00:00Z') };

    const service = new RouteSimulationService({ eventPublisher: mockEventPublisher, clock: mockClock });

    let callbackFired = false;
    service.subscribeToPositionUpdates('v-100', (payload) => {
      callbackFired = true;
      assert.equal(payload.vehicleId, 'v-100');
    });

    const route = new Route({
      id: 'r-sim',
      vehicleId: 'v-100',
      depot: new Depot({ latitude: 30.0, longitude: -97.0 }),
      stops: [new RouteStop({ id: 's1', latitude: 30.2, longitude: -97.2 })],
    });

    const payload = await service.simulateTick(route, 0.5);
    assert.ok(payload !== null);
    assert.equal(payload.latitude, 30.1);
    assert.equal(payload.longitude, -97.1);
    assert.equal(callbackFired, true);
    assert.equal(publishedEvents.length, 1);
    assert.equal(publishedEvents[0].eventType, 'routing.vehicle-position-updated');
  });
});

describe('CalculateRouteEfficiencyUseCase', () => {
  it('computes planned vs actual distance/duration variance and efficiency score', async () => {
    const route = new Route({
      id: 'r-eff',
      depot: new Depot({ latitude: 30.0, longitude: -97.0 }),
      stops: [new RouteStop({ id: 's1', latitude: 30.1, longitude: -97.0 })],
      totalDistanceKm: 20.0,
      totalDurationMinutes: 30,
    });

    const mockRepo = {
      findById: async (id) => (id === 'r-eff' ? route : null),
    };

    const useCase = new CalculateRouteEfficiencyUseCase({ routeRepository: mockRepo });
    const res = await useCase.execute({
      routeId: 'r-eff',
      actualDistanceKm: 22.0,
      actualDurationMinutes: 33,
    });

    assert.equal(res.plannedDistanceKm, 20.0);
    assert.equal(res.actualDistanceKm, 22.0);
    assert.equal(res.distanceVarianceKm, 2.0);
    assert.equal(res.durationVarianceMinutes, 3);
    assert.ok(res.efficiencyScorePercent > 80 && res.efficiencyScorePercent <= 100);
  });
});
