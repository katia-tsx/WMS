'use strict';

/**
 * A small, JSON-Schema-*inspired* validator — not a full Draft 7/2020-12
 * implementation (that spec is enormous; a partial reimplementation
 * would be riskier than useful). It supports exactly the keywords this
 * API's request bodies need:
 *
 *   type            'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array'
 *   required        string[]                          (type: 'object')
 *   properties      { [key]: schema }                  (type: 'object')
 *   additionalProperties  boolean, default true         (type: 'object')
 *   items           schema                             (type: 'array')
 *   minItems/maxItems                                   (type: 'array')
 *   minLength/maxLength                                 (type: 'string')
 *   minimum/maximum                                     (type: 'number'/'integer')
 *   enum            *[]                                 (any type)
 *
 * Every schema here is a plain object, so it also doubles as the
 * `requestBody`/response schema OpenAPI's generateOpenApiDocument.js
 * embeds directly — one schema, two uses, no drift between "what we
 * validate" and "what we document".
 */

/**
 * @param {*} value
 * @returns {'object'|'array'|'string'|'number'|'boolean'|'null'}
 */
function jsonTypeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // 'object' | 'string' | 'number' | 'boolean' | 'undefined'
}

/**
 * @param {Object} schema
 * @param {*} value
 * @param {string} path human-readable location for error messages, e.g. 'amount' or 'lines[0].sku'
 * @returns {string[]} validation error messages; empty if `value` satisfies `schema`
 */
function validate(schema, value, path = 'value') {
  const errors = [];

  if (schema.type) {
    const actualType = jsonTypeOf(value);
    const satisfiesType =
      schema.type === actualType ||
      (schema.type === 'integer' && actualType === 'number' && Number.isInteger(value));

    if (!satisfiesType) {
      errors.push(`${path} must be of type ${schema.type}, got ${actualType}`);
      return errors; // further keywords assume the base type already holds
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of ${JSON.stringify(schema.enum)}`);
  }

  if (schema.type === 'object' && value !== null) {
    for (const key of schema.required || []) {
      if (!(key in value)) {
        errors.push(`${path === 'value' ? '' : `${path}.`}${key} is required`);
      }
    }

    for (const [key, subSchema] of Object.entries(schema.properties || {})) {
      if (key in value) {
        errors.push(...validate(subSchema, value[key], `${path === 'value' ? '' : `${path}.`}${key}`));
      }
    }

    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          errors.push(`${path === 'value' ? '' : `${path}.`}${key} is not an allowed property`);
        }
      }
    }
  }

  if (schema.type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} must have at least ${schema.minItems} item(s)`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path} must have at most ${schema.maxItems} item(s)`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validate(schema.items, item, `${path}[${index}]`));
      });
    }
  }

  if (schema.type === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} must be at least ${schema.minLength} character(s)`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} must be at most ${schema.maxLength} character(s)`);
    }
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path} must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path} must be <= ${schema.maximum}`);
    }
  }

  return errors;
}

module.exports = { validate, jsonTypeOf };
