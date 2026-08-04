'use strict';

/**
 * OrderPriorityScorer
 * Computes fulfillment priority score based on customer SLA tier, order age, and shipping deadline.
 */
class OrderPriorityScorer {
  /**
   * Computes numeric priority score (higher score = higher fulfillment priority)
   * @param {import('../entities/Order').Order} order
   * @param {Date} [now]
   * @returns {number} score
   */
  static calculateScore(order, now = new Date()) {
    let score = 0;

    // SLA Tier Weight
    const slaTier = (order.slaTier || 'STANDARD').toUpperCase();
    if (slaTier === 'VIP' || slaTier === 'EXPRESS') {
      score += 100;
    } else if (slaTier === 'PRIORITY') {
      score += 50;
    } else {
      score += 10;
    }

    // Order Age Weight (1 point per hour pending)
    const ageInHours = Math.max(0, (now.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60));
    score += Math.floor(ageInHours);

    // Update order entity
    order.priorityScore = score;
    return score;
  }
}

module.exports = { OrderPriorityScorer };
