'use strict';

const { Guard } = require('../../../domain/shared-kernel/guard/Guard');
const { NotFoundError } = require('../../../domain/shared-kernel/errors/DomainError');
const { toProblemDetails } = require('./ResultToHttpMapper');

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * @param {string} path e.g. '/inventory/:sku/reserve'
 * @returns {{ regex: RegExp, paramNames: string[] }}
 */
function compilePath(path) {
  const paramNames = [];
  const normalized = path.replace(/\/+$/, '') || '/';
  const pattern = normalized
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      // Escape regex-special characters in literal segments.
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${pattern}$`), paramNames };
}

/**
 * Runs a chain of Connect/Express-style `(req, res, next)` middleware in
 * order, resolving once every middleware has called `next()` with no
 * argument, or rejecting as soon as one calls `next(error)` or throws.
 * Hand-rolled rather than pulled from `connect`/`express` — this is the
 * entire mechanism, no hidden behavior.
 *
 * @param {function(*,*,function(Error=):void)[]} middlewareList
 * @param {*} req
 * @param {*} res
 * @returns {Promise<void>}
 */
function runMiddlewareChain(middlewareList, req, res) {
  return new Promise((resolve, reject) => {
    let lastIndex = -1;

    function dispatch(index) {
      if (index <= lastIndex) {
        reject(new Error('next() called multiple times in the same middleware chain'));
        return;
      }
      lastIndex = index;

      const middleware = middlewareList[index];
      if (!middleware) {
        resolve();
        return;
      }

      try {
        const maybePromise = middleware(req, res, (err) => {
          if (err) reject(err);
          else dispatch(index + 1);
        });
        // Support `async (req, res, next) => { ... }` middleware whose
        // own rejection should also fail the chain, not just an
        // explicit `next(error)` call.
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    }

    dispatch(0);
  });
}

/**
 * @param {*} res
 * @param {{ status: number, body?: *, headers?: Object<string,string> }} response
 */
function writeJsonResponse(res, { status, body, headers = {} }) {
  const hasBody = body !== undefined;
  const payload = hasBody ? JSON.stringify(body) : '';
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...headers,
    ...(hasBody ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
  });
  res.end(payload);
}

/**
 * Router is a minimal, dependency-free HTTP router built directly on
 * Node's `http` module types (it never touches `http.createServer`
 * itself — see createHttpServer.js): path parameters (`:sku`),
 * per-route and global middleware chains, and a single centralized
 * place (`handle`) where every response — success, a mapped `Result`
 * error, or an uncaught exception — is written to `res`. Route handlers
 * themselves never call `res.write`/`res.end` directly; they return a
 * `{ status, body }` descriptor (see
 * infrastructure/adapters/http/controllers/InventoryController.js) and
 * `handle` writes it,
 * which is what keeps controllers unit-testable without an HTTP
 * connection at all.
 *
 * Registering a route also attaches machine-readable metadata (`meta`)
 * describing it, consumed by generateOpenApiDocument.js to produce an
 * OpenAPI 3.0 document straight from the routes actually registered,
 * rather than a hand-maintained spec that drifts from the code.
 */
class Router {
  constructor() {
    /** @type {function(*,*,function(Error=):void)[]} */
    this.globalMiddleware = [];
    /** @type {{ method: string, path: string, regex: RegExp, paramNames: string[], middleware: Function[], handler: Function, meta: Object }[]} */
    this.routes = [];
  }

  /**
   * @param {function(*,*,function(Error=):void)} middleware
   * @returns {Router}
   */
  use(middleware) {
    Guard.againstNullOrUndefined(middleware, 'middleware');
    this.globalMiddleware.push(middleware);
    return this;
  }

  /**
   * @param {string} method
   * @param {string} path
   * @param {function(*, *): (Promise<{status:number,body?:*}>|{status:number,body?:*})} handler
   * @param {{ middleware?: Function[], meta?: Object }} [options]
   * @returns {Router}
   */
  route(method, path, handler, { middleware = [], meta = {} } = {}) {
    const upperMethod = method.toUpperCase();
    if (!METHODS.includes(upperMethod)) {
      throw new TypeError(`Unsupported HTTP method "${method}". Supported: ${METHODS.join(', ')}.`);
    }
    Guard.againstEmptyString(path, 'path');
    Guard.againstNullOrUndefined(handler, 'handler');

    const { regex, paramNames } = compilePath(path);
    this.routes.push({ method: upperMethod, path, regex, paramNames, middleware, handler, meta });
    return this;
  }

  /** @param {string} path @param {Function} handler @param {{middleware?:Function[],meta?:Object}} [options] */
  get(path, handler, options) {
    return this.route('GET', path, handler, options);
  }

  /** @param {string} path @param {Function} handler @param {{middleware?:Function[],meta?:Object}} [options] */
  post(path, handler, options) {
    return this.route('POST', path, handler, options);
  }

  /** @param {string} path @param {Function} handler @param {{middleware?:Function[],meta?:Object}} [options] */
  put(path, handler, options) {
    return this.route('PUT', path, handler, options);
  }

  /** @param {string} path @param {Function} handler @param {{middleware?:Function[],meta?:Object}} [options] */
  patch(path, handler, options) {
    return this.route('PATCH', path, handler, options);
  }

  /** @param {string} path @param {Function} handler @param {{middleware?:Function[],meta?:Object}} [options] */
  delete(path, handler, options) {
    return this.route('DELETE', path, handler, options);
  }

  /**
   * @param {string} method
   * @param {string} pathname
   * @returns {{route: Object, params: Object<string,string>}|null}
   */
  _match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = route.regex.exec(pathname);
      if (!match) continue;
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      return { route, params };
    }
    return null;
  }

  /**
   * The single entry point a real (or mock — see Router.test.js)
   * `http.IncomingMessage`/`http.ServerResponse` pair is handed to.
   *
   * Pre:  `req.method` and `req.url` are set (as they always are on a
   *       real Node request).
   * Post: exactly one response has been written to `res` — the matched
   *       route's result, a 404 Problem Details body if nothing
   *       matched, or a mapped Problem Details body if anything along
   *       the way (global middleware, route middleware, the handler
   *       itself) threw or called `next(error)`.
   *
   * @param {*} req
   * @param {*} res
   * @returns {Promise<void>}
   */
  async handle(req, res) {
    const pathname = (req.url || '/').split('?')[0];

    try {
      const matched = this._match(req.method, pathname);

      if (!matched) {
        const { status, body, headers } = toProblemDetails(
          new NotFoundError(`No route matches ${req.method} ${pathname}.`),
          { instance: pathname },
        );
        writeJsonResponse(res, { status, body, headers });
        return;
      }

      req.params = matched.params;

      await runMiddlewareChain([...this.globalMiddleware, ...matched.route.middleware], req, res);

      const outcome = await matched.route.handler(req, res);
      writeJsonResponse(res, outcome);
    } catch (error) {
      const { status, body, headers } = toProblemDetails(error, { instance: pathname });
      writeJsonResponse(res, { status, body, headers });
    }
  }
}

module.exports = { Router, compilePath, runMiddlewareChain, writeJsonResponse };
