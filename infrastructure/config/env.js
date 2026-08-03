'use strict';

const path = require('path');

/**
 * Loads a .env file into process.env using Node's built-in env-file
 * loader (`process.loadEnvFile`, stable since Node 20.12/21.7) — no
 * "dotenv" package dependency needed for something this small. Existing
 * process.env values always win: Node's loader only fills in variables
 * that are not already set, so a real environment variable injected by a
 * process manager, CI, or a container orchestrator is never overridden by
 * a stray .env committed to disk.
 *
 * Pre:  none — safe to call whether or not a .env file exists (e.g. in
 *       CI, or production, where configuration comes from real
 *       environment variables rather than a file).
 * Post: any KEY=VALUE pair from the file is present in process.env unless
 *       that key was already set.
 *
 * @param {string} [filePath]
 * @returns {void}
 */
function loadEnvFile(filePath = path.resolve(process.cwd(), '.env')) {
  try {
    process.loadEnvFile(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/**
 * The runtime mode that drives environment-based DI bindings (see
 * infrastructure/di/CompositionRoot.js). `RUNTIME_MODE` takes precedence
 * over `NODE_ENV` so a deployment can, for example, run with
 * `NODE_ENV=production` while `RUNTIME_MODE=test` for a staging
 * smoke-test pass. Defaults to `"development"` when neither is set.
 *
 * @returns {string}
 */
function getRuntimeMode() {
  return process.env.RUNTIME_MODE || process.env.NODE_ENV || 'development';
}

module.exports = { loadEnvFile, getRuntimeMode };
