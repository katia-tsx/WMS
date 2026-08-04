'use strict';

/**
 * HaversineDistanceCalculator
 * Computes straight-line great-circle distance (km) and estimated drive time (minutes)
 * between geographic coordinates.
 */
class HaversineDistanceCalculator {
  /**
   * Calculates distance in kilometers between two lat/lon pairs using Haversine formula.
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number} Distance in kilometers
   */
  static calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Estimates drive time in minutes based on average speed (e.g. 50 km/h)
   * @param {number} distanceKm
   * @param {number} [avgSpeedKmH=50]
   * @returns {number} Duration in minutes
   */
  static estimateDriveTimeMinutes(distanceKm, avgSpeedKmH = 50) {
    if (distanceKm <= 0) return 0;
    return Math.round((distanceKm / avgSpeedKmH) * 60);
  }
}

module.exports = { HaversineDistanceCalculator };
