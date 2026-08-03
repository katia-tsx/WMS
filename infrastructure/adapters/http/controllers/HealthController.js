'use strict';

/**
 * HealthController — a driving adapter for container-orchestration
 * probes (Kubernetes-style liveness/readiness, but framework-agnostic
 * like every other controller here: no `res`, a plain `{ status, body }`
 * return).
 *
 * `/health` (liveness) and `/ready` (readiness) answer different
 * questions on purpose:
 *
 *  - **Liveness** ("is this process alive and responsive at all?")
 *    never touches a dependency — a flaky database should restart the
 *    database, not cause an orchestrator to kill and reschedule a
 *    perfectly healthy process in a crash-loop.
 *  - **Readiness** ("should traffic be routed to this instance right
 *    now?") does check dependencies, because a process that's alive but
 *    can't reach its database genuinely isn't ready to serve requests.
 *
 * @param {Object} deps
 * @param {{ findAll: function(): Promise<*> }} deps.inventoryRepository used as the readiness check's "can we actually reach storage" probe — findAll() is a real read already on the port, not a method invented just for this
 * @param {{ publish: function(*): Promise<void> }} deps.eventPublisher
 */
function createHealthController({ inventoryRepository, eventPublisher }) {
  return {
    /**
     * GET /health
     * @returns {Promise<{status: number, body: Object}>}
     */
    async liveness() {
      return { status: 200, body: { status: 'ok', uptimeSeconds: Math.round(process.uptime()) } };
    },

    /**
     * GET /ready
     * @returns {Promise<{status: number, body: Object}>}
     */
    async readiness() {
      const checks = {};
      let healthy = true;

      try {
        await inventoryRepository.findAll();
        checks.database = { status: 'up' };
      } catch (error) {
        healthy = false;
        checks.database = { status: 'down', error: error.message };
      }

      // Only EventBus (infrastructure/events/EventBus.js) exposes a
      // dead-letter queue; ConsoleEventPublisher/InMemoryEventPublisher
      // don't, and that's fine — there's simply nothing to report beyond
      // "reachable", which constructing it at all already proves.
      checks.eventBus =
        'deadLetterQueue' in eventPublisher
          ? { status: 'up', deadLetterCount: eventPublisher.deadLetterQueue.length }
          : { status: 'up' };

      return {
        status: healthy ? 200 : 503,
        body: { status: healthy ? 'ready' : 'not_ready', checks },
      };
    },
  };
}

module.exports = { createHealthController };
