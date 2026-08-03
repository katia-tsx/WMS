'use strict';

const { ValidationError } = require('../../../../domain/shared-kernel/errors/DomainError');

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024; // 1 MiB — generous for a JSON API request, not unbounded

/**
 * @param {*} req a readable stream (a real http.IncomingMessage, or
 *   anything async-iterable yielding Buffer/string chunks — see
 *   Router.test.js's mockReq)
 * @param {number} maxBytes
 * @returns {Promise<string>}
 */
async function readBody(req, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new ValidationError(`Request body exceeds the ${maxBytes}-byte limit.`, 'PAYLOAD_TOO_LARGE');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Middleware factory: parses a JSON request body into `req.body`,
 * rejecting a malformed payload with a `ValidationError` (mapped to 400
 * by ResultToHttpMapper — see Router.js) *before* any route handler, and
 * therefore any use case, ever sees it.
 *
 * Only attempts parsing for methods that conventionally carry a body
 * (POST/PUT/PATCH) and a `Content-Type` containing `application/json`;
 * anything else gets `req.body = {}` so handlers can destructure it
 * unconditionally without a null check.
 *
 * @param {{ maxBytes?: number }} [options]
 * @returns {function(*, *, function(Error=):void): Promise<void>}
 */
function jsonBodyParser({ maxBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  return async function jsonBodyParserMiddleware(req, res, next) {
    const method = (req.method || 'GET').toUpperCase();
    const contentType = req.headers?.['content-type'] || '';

    if (!['POST', 'PUT', 'PATCH'].includes(method) || !contentType.includes('application/json')) {
      req.body = {};
      next();
      return;
    }

    try {
      const raw = await readBody(req, maxBytes);
      req.body = raw.trim().length ? JSON.parse(raw) : {};
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error);
        return;
      }
      next(new ValidationError('Request body must be valid JSON.'));
    }
  };
}

module.exports = { jsonBodyParser, readBody };
