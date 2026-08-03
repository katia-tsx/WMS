'use strict';

const {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
} = require('../../../domain/shared-kernel/errors/DomainError');
const { AuthorizationError } = require('../../../application/errors/AuthorizationError');

const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/**
 * Ordered [ErrorClass, status, title] table. Checked top to bottom so a
 * subclass relationship (there isn't one today, but AuthorizationError
 * extending DomainError means one could exist) resolves to the more
 * specific entry.
 */
const ERROR_STATUS_TABLE = [
  [ValidationError, 400, 'Bad Request'],
  [AuthorizationError, 403, 'Forbidden'],
  [NotFoundError, 404, 'Not Found'],
  [ConflictError, 409, 'Conflict'],
  [BusinessRuleViolationError, 422, 'Unprocessable Entity'],
];

/**
 * Maps a DomainError (or AuthorizationError) to the HTTP status code its
 * failure represents, so every controller normalizes errors the same
 * way instead of each guessing its own status codes. Anything else —
 * including a bare thrown Error a bug produced — maps to 500: an
 * "unexpected error" is, by definition, not one of the expected
 * business failures this table knows how to name.
 *
 * @param {Error} error
 * @returns {number}
 */
function statusForError(error) {
  for (const [ErrorClass, status] of ERROR_STATUS_TABLE) {
    if (error instanceof ErrorClass) return status;
  }
  return 500;
}

/**
 * @param {number} status
 * @returns {string}
 */
function titleForStatus(status) {
  const entry = ERROR_STATUS_TABLE.find(([, s]) => s === status);
  if (entry) return entry[2];
  return status === 500 ? 'Internal Server Error' : 'Error';
}

/**
 * Builds an RFC 7807 (Problem Details for HTTP APIs) response body from
 * an error. `type` is deliberately `about:blank` — the spec's own
 * sanctioned default for "no further information beyond title/status" —
 * rather than a fabricated documentation URL this repo doesn't publish;
 * `code` (an extension member) carries the same machine-readable string
 * `error.code` already provides elsewhere (see DomainError).
 *
 * For a 500, `detail` is intentionally generic rather than the real
 * `error.message`: an unexpected error's message may contain internal
 * detail (a stack frame, a file path, a driver's own error text) that
 * should never reach a client. Expected failures (400/403/404/409/422)
 * have already had their message written for an API consumer to read
 * (see e.g. AdjustStockUseCase), so those pass `error.message` through
 * unchanged.
 *
 * @param {Error} error
 * @param {{ instance?: string }} [options]
 * @returns {{ status: number, body: Object, headers: Object<string,string> }}
 */
function toProblemDetails(error, { instance } = {}) {
  const status = statusForError(error);
  const isUnexpected = status === 500;

  const body = {
    type: 'about:blank',
    title: titleForStatus(status),
    status,
    detail: isUnexpected ? 'An unexpected error occurred.' : error.message,
    code: isUnexpected ? 'INTERNAL_ERROR' : (error.code ?? 'INTERNAL_ERROR'),
    ...(instance ? { instance } : {}),
  };

  return { status, body, headers: { 'Content-Type': PROBLEM_CONTENT_TYPE } };
}

/**
 * Converts a use case's `Result` into an HTTP response descriptor
 * (`{ status, body }`) — the one place a controller needs to call to go
 * from "what the application layer returned" to "what to send back over
 * HTTP", so every controller maps errors identically. See
 * infrastructure/adapters/http/controllers/InventoryController.js for a
 * worked example.
 *
 * @param {import('../../../domain/shared-kernel/result/Result').Result} result
 * @param {{ instance?: string, onOk?: function(*): * }} [options]
 * @returns {{ status: number, body?: Object, headers?: Object<string,string> }}
 */
function toHttpResponse(result, { instance, onOk } = {}) {
  return result.match({
    ok: (value) => ({ status: 200, body: onOk ? onOk(value) : value }),
    err: (error) => toProblemDetails(error, { instance }),
  });
}

module.exports = { statusForError, titleForStatus, toProblemDetails, toHttpResponse, PROBLEM_CONTENT_TYPE };
