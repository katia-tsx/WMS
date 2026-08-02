'use strict';

const path = require('path');

/**
 * Layers ordered from innermost to outermost. The Dependency Rule says
 * source code dependencies may only point inward: a file may import from
 * its own layer or any layer with a *lower* index, never a higher one.
 */
const LAYER_ORDER = ['domain', 'application', 'infrastructure'];

/**
 * @param {string} absolutePath
 * @returns {string|null}
 */
function getLayer(absolutePath) {
  const segments = absolutePath.split(path.sep);
  return LAYER_ORDER.find((layer) => segments.includes(layer)) ?? null;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce the Hexagonal Architecture dependency rule: dependencies may only point inward (infrastructure -> application -> domain), never outward.',
      recommended: true,
    },
    schema: [],
    messages: {
      violation:
        "Dependency rule violation: code in '{{fromLayer}}/' must not import from '{{toLayer}}/'. Dependencies may only point inward — see ARCHITECTURE.md.",
    },
  },
  create(context) {
    const filename = context.getFilename();
    const fromLayer = getLayer(filename);
    if (!fromLayer) return {};

    const fromIndex = LAYER_ORDER.indexOf(fromLayer);

    /**
     * @param {import('eslint').Rule.Node} node
     * @param {string} source
     */
    function checkSource(node, source) {
      if (!source.startsWith('.')) return; // ignore bare specifiers (npm packages, node builtins)

      const resolved = path.resolve(path.dirname(filename), source);
      const toLayer = getLayer(resolved);
      if (!toLayer) return;

      const toIndex = LAYER_ORDER.indexOf(toLayer);
      if (toIndex > fromIndex) {
        context.report({ node, messageId: 'violation', data: { fromLayer, toLayer } });
      }
    }

    return {
      ImportDeclaration(node) {
        checkSource(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
          checkSource(node, node.source.value);
        }
      },
      CallExpression(node) {
        const isRequire = node.callee.type === 'Identifier' && node.callee.name === 'require';
        const arg = node.arguments[0];
        if (isRequire && arg && arg.type === 'Literal' && typeof arg.value === 'string') {
          checkSource(node, arg.value);
        }
      },
    };
  },
};
