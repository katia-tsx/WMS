'use strict';

/**
 * Process entry point for the HTTP API — `npm run serve` /
 * `node infrastructure/adapters/http/main.js`. Nothing else in this
 * codebase requires this file; it exists only to actually bind a port,
 * the one thing a test never does (see routes.test.js, which binds port
 * 0 — an OS-assigned ephemeral port — and tears the server down when
 * done). Everything it does is already exercised, piece by piece, by
 * CompositionRoot.test.js and routes.test.js; this just calls
 * `buildApp()` the same way and listens.
 */
const { buildApp } = require('../../di/CompositionRoot');

const app = buildApp();
const port = Number(process.env.HTTP_PORT) || 3000;

app.httpServer.listen(port, () => {
  app.logger.info(`WMS API listening on http://localhost:${port}`);
});
