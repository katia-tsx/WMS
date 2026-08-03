'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig, ConfigError } = require('./Config');

const MANAGED_VARS = ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'HTTP_PORT'];

describe('loadConfig', () => {
  let originalValues;

  beforeEach(() => {
    originalValues = Object.fromEntries(MANAGED_VARS.map((name) => [name, process.env[name]]));
    for (const name of MANAGED_VARS) delete process.env[name];
  });

  afterEach(() => {
    for (const name of MANAGED_VARS) {
      if (originalValues[name] === undefined) delete process.env[name];
      else process.env[name] = originalValues[name];
    }
  });

  test('in non-production modes, DATABASE_URL/SUPABASE_SERVICE_ROLE_KEY are not required', () => {
    assert.doesNotThrow(() => loadConfig({ mode: 'test' }));
    assert.doesNotThrow(() => loadConfig({ mode: 'development' }));
  });

  test('in production mode, throws a ConfigError naming every missing required variable', () => {
    assert.throws(() => loadConfig({ mode: 'production' }), (error) => {
      assert.ok(error instanceof ConfigError);
      assert.deepEqual(error.missingVars, ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
      assert.match(error.message, /DATABASE_URL/);
      assert.match(error.message, /SUPABASE_SERVICE_ROLE_KEY/);
      return true;
    });
  });

  test('in production mode, throws naming only whichever required variable is actually missing', () => {
    process.env.DATABASE_URL = 'postgres://x';
    assert.throws(() => loadConfig({ mode: 'production' }), (error) => {
      assert.deepEqual(error.missingVars, ['SUPABASE_SERVICE_ROLE_KEY']);
      return true;
    });
  });

  test('in production mode, succeeds once both required variables are set', () => {
    process.env.DATABASE_URL = 'postgres://x';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const config = loadConfig({ mode: 'production' });
    assert.equal(config.databaseUrl, 'postgres://x');
    assert.equal(config.supabaseServiceRoleKey, 'service-role-key');
  });

  test('defaults httpPort to 3000 when HTTP_PORT is unset, and parses it as a number otherwise', () => {
    assert.equal(loadConfig({ mode: 'test' }).httpPort, 3000);
    process.env.HTTP_PORT = '4321';
    assert.equal(loadConfig({ mode: 'test' }).httpPort, 4321);
    assert.equal(typeof loadConfig({ mode: 'test' }).httpPort, 'number');
  });

  test('optional variables are undefined, not missing/thrown, when unset', () => {
    const config = loadConfig({ mode: 'test' });
    assert.equal(config.supabaseUrl, undefined);
    assert.equal(config.supabaseAnonKey, undefined);
  });

  test('returns a frozen object: mutation attempts are silently ineffective, and strict-mode code throws', () => {
    const config = loadConfig({ mode: 'test' });
    assert.equal(Object.isFrozen(config), true);
    assert.throws(() => { config.httpPort = 9999; }, TypeError);
  });

  test('defaults mode via getRuntimeMode() when not passed explicitly', () => {
    const originalMode = process.env.RUNTIME_MODE;
    process.env.RUNTIME_MODE = 'test';
    try {
      assert.equal(loadConfig().mode, 'test');
    } finally {
      if (originalMode === undefined) delete process.env.RUNTIME_MODE;
      else process.env.RUNTIME_MODE = originalMode;
    }
  });
});
