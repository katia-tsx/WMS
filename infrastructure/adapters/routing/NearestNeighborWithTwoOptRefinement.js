'use strict';

const { IRouteOptimizationEngine } = require('../../../application/ports/IRouteOptimizationEngine');
const { HaversineDistanceCalculator } = require('../../../domain/routing/services/HaversineDistanceCalculator');

class NearestNeighborWithTwoOptRefinement extends IRouteOptimizationEngine {
  constructor({ maxTwoOptIterations = 100 } = {}) {
    super();
    this.maxTwoOptIterations = maxTwoOptIterations;
  }

  async optimize(vrpInstance) {
    const startTime = Date.now();
    const depot = vrpInstance.depot || { latitude: 30.2672, longitude: -97.7431 };
    const stops = vrpInstance.stops || [];
    const maxVehicleCap = vrpInstance.maxVehicleCapacity || 1000;

    if (stops.length === 0) {
      return {
        routes: [],
        unassignedStops: [],
        constraintViolations: [],
        solverMetrics: { executionTimeMs: 0, totalDistanceKm: 0 },
      };
    }

    // Step 1: Multi-vehicle capacity partitioning via Greedy Nearest-Neighbor
    const unvisited = [...stops];
    const rawRoutes = [];
    let currentRouteStops = [];
    let currentCap = 0;
    let currLat = depot.latitude;
    let currLon = depot.longitude;

    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        if (currentCap + candidate.demandWeight <= maxVehicleCap) {
          const d = HaversineDistanceCalculator.calculateDistanceKm(currLat, currLon, candidate.latitude, candidate.longitude);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = i;
          }
        }
      }

      if (nearestIdx !== -1) {
        const [nextStop] = unvisited.splice(nearestIdx, 1);
        currentRouteStops.push(nextStop);
        currentCap += nextStop.demandWeight;
        currLat = nextStop.latitude;
        currLon = nextStop.longitude;
      } else {
        // Start a new route for next vehicle if current vehicle is full
        if (currentRouteStops.length > 0) {
          rawRoutes.push(currentRouteStops);
          currentRouteStops = [];
          currentCap = 0;
          currLat = depot.latitude;
          currLon = depot.longitude;
        } else {
          // Unassignable stop (exceeds vehicle max capacity alone)
          break;
        }
      }
    }

    if (currentRouteStops.length > 0) {
      rawRoutes.push(currentRouteStops);
    }

    // Step 2: 2-Opt Local Search Refinement Pass per route
    const optimizedRoutes = [];
    let grandTotalDist = 0;

    for (let rIdx = 0; rIdx < rawRoutes.length; rIdx++) {
      let route = rawRoutes[rIdx];
      route = this._applyTwoOpt(depot, route);

      let routeDist = 0;
      let cLat = depot.latitude;
      let cLon = depot.longitude;

      for (let i = 0; i < route.length; i++) {
        route[i].sequenceNumber = i + 1;
        routeDist += HaversineDistanceCalculator.calculateDistanceKm(cLat, cLon, route[i].latitude, route[i].longitude);
        cLat = route[i].latitude;
        cLon = route[i].longitude;
      }
      routeDist += HaversineDistanceCalculator.calculateDistanceKm(cLat, cLon, depot.latitude, depot.longitude);
      grandTotalDist += routeDist;

      optimizedRoutes.push({
        routeId: `route-${rIdx + 1}`,
        vehicleId: `v-${rIdx + 1}`,
        stops: route,
        totalDistanceKm: Number(routeDist.toFixed(2)),
        totalDurationMinutes: HaversineDistanceCalculator.estimateDriveTimeMinutes(routeDist),
      });
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      routes: optimizedRoutes,
      unassignedStops: unvisited,
      constraintViolations: [],
      solverMetrics: {
        executionTimeMs,
        totalDistanceKm: Number(grandTotalDist.toFixed(2)),
        totalRoutesCount: optimizedRoutes.length,
      },
    };
  }

  _applyTwoOpt(depot, stops) {
    if (stops.length <= 3) return stops;

    let best = [...stops];
    let improved = true;
    let iterations = 0;

    while (improved && iterations < this.maxTwoOptIterations) {
      improved = false;
      iterations++;

      for (let i = 0; i < best.length - 1; i++) {
        for (let k = i + 1; k < best.length; k++) {
          const newRoute = this._twoOptSwap(best, i, k);
          const oldDist = this._routeDist(depot, best);
          const newDist = this._routeDist(depot, newRoute);

          if (newDist < oldDist - 0.001) {
            best = newRoute;
            improved = true;
          }
        }
      }
    }

    return best;
  }

  _twoOptSwap(route, i, k) {
    const newRoute = route.slice(0, i);
    const reversed = route.slice(i, k + 1).reverse();
    const tail = route.slice(k + 1);
    return newRoute.concat(reversed).concat(tail);
  }

  _routeDist(depot, stops) {
    let d = 0;
    let cLat = depot.latitude;
    let cLon = depot.longitude;
    for (const stop of stops) {
      d += HaversineDistanceCalculator.calculateDistanceKm(cLat, cLon, stop.latitude, stop.longitude);
      cLat = stop.latitude;
      cLon = stop.longitude;
    }
    d += HaversineDistanceCalculator.calculateDistanceKm(cLat, cLon, depot.latitude, depot.longitude);
    return d;
  }
}

module.exports = { NearestNeighborWithTwoOptRefinement };
