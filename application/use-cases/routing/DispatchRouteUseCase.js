'use strict';

const { UseCase } = require('../UseCase');
const { RouteDispatchedEvent } = require('../../../domain/routing/events/RouteDispatchedEvent');

class DispatchRouteUseCase extends UseCase {
  constructor({ routeRepository, eventPublisher }) {
    super();
    this.routeRepository = routeRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ routeId }) {
    const route = await this.routeRepository.findById(routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);

    route.dispatch();
    await this.routeRepository.save(route);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new RouteDispatchedEvent(route));
    }

    return {
      routeId: route.id,
      status: route.status,
      totalDistanceKm: route.totalDistanceKm,
      totalDurationMinutes: route.totalDurationMinutes,
    };
  }
}

module.exports = { DispatchRouteUseCase };
