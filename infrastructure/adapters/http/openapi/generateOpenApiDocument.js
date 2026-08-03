'use strict';

/**
 * Converts this router's `:param` path syntax to OpenAPI's `{param}`
 * syntax — the two conventions look similar but aren't interchangeable,
 * and only Router.js's own matching needs to know about `:param`.
 *
 * @param {string} path
 * @returns {string}
 */
function toOpenApiPath(path) {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/**
 * @param {Object} [meta]
 * @returns {Object[]|undefined}
 */
function parametersFor(meta) {
  return meta.parameters && meta.parameters.length > 0 ? meta.parameters : undefined;
}

/**
 * @param {Object} [responsesMeta]
 * @returns {Object}
 */
function buildResponses(responsesMeta = {}) {
  const responses = {};
  for (const [status, responseMeta] of Object.entries(responsesMeta)) {
    responses[String(status)] = {
      description: responseMeta.description || '',
      ...(responseMeta.schema
        ? { content: { 'application/json': { schema: responseMeta.schema } } }
        : {}),
    };
  }
  return responses;
}

/**
 * Generates an OpenAPI 3.0 document directly from the routes actually
 * registered on `router` — specifically, each route's `meta` (see
 * Router.js's `route(method, path, handler, { meta })`) — rather than a
 * hand-maintained YAML/JSON spec that silently drifts from the code as
 * routes change. A route registered with no `meta` at all still appears
 * in the document (bare path/method, no description) rather than being
 * silently omitted, so the generated spec is always a complete map of
 * what the API actually serves.
 *
 * @param {import('../Router').Router} router
 * @param {{ title: string, version: string, description?: string }} info
 * @returns {Object}
 */
function generateOpenApiDocument(router, info) {
  const paths = {};

  for (const route of router.routes) {
    const meta = route.meta || {};
    const openApiPath = toOpenApiPath(route.path);
    paths[openApiPath] = paths[openApiPath] || {};

    paths[openApiPath][route.method.toLowerCase()] = {
      ...(meta.summary ? { summary: meta.summary } : {}),
      ...(meta.tags ? { tags: meta.tags } : {}),
      ...(parametersFor(meta) ? { parameters: parametersFor(meta) } : {}),
      ...(meta.requestBody
        ? { requestBody: { required: true, content: { 'application/json': { schema: meta.requestBody } } } }
        : {}),
      responses: buildResponses(meta.responses),
    };
  }

  return {
    openapi: '3.0.3',
    info: { title: info.title, version: info.version, ...(info.description ? { description: info.description } : {}) },
    paths,
  };
}

module.exports = { generateOpenApiDocument, toOpenApiPath };
