'use strict';

const http = require('node:http');

/**
 * The one place this HTTP layer touches Node's `http` module directly —
 * everything else (Router, middleware, controllers) works against plain
 * `req`/`res`-shaped objects and is testable without ever opening a
 * socket (see Router.test.js's mockReq/mockRes). This function is the
 * seam where a real socket meets that: every request Node hands it is
 * delegated straight to `router.handle`, which is responsible for
 * writing a response no matter what happens (a matched route, a 404, or
 * a mapped error — see Router.js).
 *
 * @param {import('./Router').Router} router
 * @returns {import('node:http').Server}
 */
function createHttpServer(router) {
  return http.createServer((req, res) => {
    router.handle(req, res).catch((error) => {
      // router.handle already catches everything it can attribute to a
      // specific request; reaching here means writing the response
      // itself failed (e.g. the socket closed mid-write) — nothing left
      // to send the client, just don't crash the process over it.
      console.error('Unhandled error writing an HTTP response:', error);
    });
  });
}

module.exports = { createHttpServer };
