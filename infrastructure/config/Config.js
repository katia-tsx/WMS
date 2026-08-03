'use strict';

const { loadEnvFile, getRuntimeMode } = require('./env');

/**
 * Raised by `loadConfig` when a required environment variable is
 * missing. A programmer/ops error, not a business one — there is no
 * sensible way to keep running without it, so this is thrown directly
 * rather than wrapped in a `Result`, and is meant to crash startup
 * loudly rather than be caught anywhere.
 */
class ConfigError extends Error {
  /** @param {string[]} missingVars */
  constructor(missingVars) {
    super(`Missing required environment variable(s): ${missingVars.join(', ')}. See .env.example.`);
    this.name = 'ConfigError';
    this.missingVars = missingVars;
  }
}

/**
 * @typedef {Object} AppConfig
 * @property {string} mode
 * @property {string} [databaseUrl]
 * @property {string} [supabaseUrl]
 * @property {string} [supabaseAnonKey]
 * @property {string} [supabaseServiceRoleKey]
 * @property {number} httpPort
 */

/**
 * Required in every mode; adjust this table to add another. Each entry
 * maps the environment variable name to the `AppConfig` key it becomes.
 */
const REQUIRED_IN_PRODUCTION = [
  ['DATABASE_URL', 'databaseUrl'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'supabaseServiceRoleKey'],
];

/** Read, but never required — absent simply means `undefined` in the returned config. */
const OPTIONAL = [
  ['SUPABASE_URL', 'supabaseUrl'],
  ['SUPABASE_ANON_KEY', 'supabaseAnonKey'],
];

/**
 * Loads and validates every environment variable this app reads,
 * failing fast — synchronously, at startup (see
 * infrastructure/adapters/http/main.js), before anything else runs —
 * rather than letting a missing secret surface later as a confusing
 * runtime error deep inside a request. Returns a frozen, typed
 * `AppConfig`: nothing downstream can accidentally mutate a config value
 * some other part of the app is relying on.
 *
 * `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are only *required* —
 * throwing a `ConfigError` naming every missing one, not just the first
 * — when `mode === 'production'`. Development and test intentionally run
 * against zero external services (in-memory adapters — see
 * infrastructure/di/CompositionRoot.js's mode switch); demanding real
 * secrets in either would contradict that on every `npm test` run. Both
 * are still read into the returned config in any mode where they happen
 * to be set.
 *
 * @param {{ mode?: string }} [options]
 * @returns {Readonly<AppConfig>}
 */
function loadConfig({ mode = getRuntimeMode() } = {}) {
  loadEnvFile();

  if (mode === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter(([envVar]) => !process.env[envVar]).map(([envVar]) => envVar);
    if (missing.length > 0) {
      throw new ConfigError(missing);
    }
  }

  const config = { mode, httpPort: Number(process.env.HTTP_PORT) || 3000 };
  for (const [envVar, key] of [...REQUIRED_IN_PRODUCTION, ...OPTIONAL]) {
    config[key] = process.env[envVar] || undefined;
  }

  return Object.freeze(config);
}

module.exports = { loadConfig, ConfigError };
