'use strict';

const { Guard } = require('../../../../domain/shared-kernel/guard/Guard');
const { ValidationError } = require('../../../../domain/shared-kernel/errors/DomainError');
const { validate } = require('../validation/JsonSchemaValidator');

/**
 * Middleware factory: validates `req.body` (already parsed by
 * jsonBodyParser — register that first) against a schema, rejecting with
 * a `ValidationError` (400) if it doesn't conform, before the route
 * handler — and so before any use case — ever runs.
 *
 * The same `schema` object is reused, unchanged, as the route's
 * `meta.requestBody` for OpenAPI generation (see
 * generateOpenApiDocument.js) — what's validated and what's documented
 * can never silently drift apart, because they're the same object.
 *
 * @param {Object} schema a JsonSchemaValidator-compatible schema
 * @returns {function(*, *, function(Error=):void): void}
 */
function validateBody(schema) {
  Guard.againstNullOrUndefined(schema, 'schema');
  return function validateBodyMiddleware(req, res, next) {
    const errors = validate(schema, req.body, 'body');
    if (errors.length > 0) {
      next(new ValidationError(errors.join('; ')));
      return;
    }
    next();
  };
}

module.exports = { validateBody };
