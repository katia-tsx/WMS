'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Container } = require('./Container');
const { UnregisteredDependencyError, CircularDependencyError } = require('./errors');

describe('Container#register / #has', () => {
  test('has() is false before registration and true after', () => {
    const container = new Container();
    assert.equal(container.has('thing'), false);
    container.register('thing', () => 42);
    assert.equal(container.has('thing'), true);
  });

  test('register() returns the container so calls can be chained', () => {
    const container = new Container();
    const result = container.register('a', () => 1).register('b', () => 2);
    assert.equal(result, container);
  });

  test('rejects a non-function factory', () => {
    assert.throws(() => new Container().register('thing', 42), TypeError);
  });

  test('rejects an unknown lifetime', () => {
    assert.throws(() => new Container().register('thing', () => 1, { lifetime: 'scoped' }), TypeError);
  });
});

describe('Container#resolve — unregistered names', () => {
  test('throws UnregisteredDependencyError with the missing name', () => {
    const container = new Container();
    assert.throws(() => container.resolve('missing'), (error) => {
      assert.ok(error instanceof UnregisteredDependencyError);
      assert.equal(error.dependencyName, 'missing');
      return true;
    });
  });
});

describe('Container#resolve — transient lifetime', () => {
  test('is the default lifetime and calls the factory again on every resolve', () => {
    let calls = 0;
    const container = new Container();
    container.register('id', () => ++calls);

    assert.equal(container.resolve('id'), 1);
    assert.equal(container.resolve('id'), 2);
    assert.equal(container.resolve('id'), 3);
  });

  test('produces distinct object instances', () => {
    const container = new Container();
    container.register('widget', () => ({}));
    assert.notEqual(container.resolve('widget'), container.resolve('widget'));
  });
});

describe('Container#resolve — singleton lifetime', () => {
  test('calls the factory only once and returns the same instance thereafter', () => {
    let calls = 0;
    const container = new Container();
    container.register('id', () => ++calls, { lifetime: 'singleton' });

    assert.equal(container.resolve('id'), 1);
    assert.equal(container.resolve('id'), 1);
    assert.equal(calls, 1);
  });

  test('re-registering the same name discards the cached singleton', () => {
    const container = new Container();
    container.register('value', () => 'first', { lifetime: 'singleton' });
    assert.equal(container.resolve('value'), 'first');

    container.register('value', () => 'second', { lifetime: 'singleton' });
    assert.equal(container.resolve('value'), 'second');
  });
});

describe('Container#resolve — constructor injection via factories', () => {
  class Engine {}
  class Car {
    constructor(engine) {
      this.engine = engine;
    }
  }

  test('a factory can resolve its own dependencies from the container it receives', () => {
    const container = new Container();
    container.register('engine', () => new Engine(), { lifetime: 'singleton' });
    container.register('car', (c) => new Car(c.resolve('engine')));

    const car = container.resolve('car');
    assert.ok(car instanceof Car);
    assert.ok(car.engine instanceof Engine);
    assert.equal(car.engine, container.resolve('engine'));
  });
});

describe('Container#resolve — circular dependency detection', () => {
  test('a directly self-referential binding throws CircularDependencyError', () => {
    const container = new Container();
    container.register('a', (c) => c.resolve('a'));

    assert.throws(() => container.resolve('a'), (error) => {
      assert.ok(error instanceof CircularDependencyError);
      assert.deepEqual(error.cyclePath, ['a', 'a']);
      assert.match(error.message, /a -> a/);
      return true;
    });
  });

  test('a multi-step cycle (a -> b -> c -> a) throws with the full path', () => {
    const container = new Container();
    container.register('a', (c) => c.resolve('b'));
    container.register('b', (c) => c.resolve('c'));
    container.register('c', (c) => c.resolve('a'));

    assert.throws(() => container.resolve('a'), (error) => {
      assert.ok(error instanceof CircularDependencyError);
      assert.deepEqual(error.cyclePath, ['a', 'b', 'c', 'a']);
      return true;
    });
  });

  test('resolving the same name twice in sequence (not nested) is not a cycle', () => {
    const container = new Container();
    container.register('leaf', () => 'value');
    container.register('root', (c) => [c.resolve('leaf'), c.resolve('leaf')]);

    assert.deepEqual(container.resolve('root'), ['value', 'value']);
  });

  test('after a failed resolution, the container is left usable (the resolution stack is cleaned up)', () => {
    const container = new Container();
    container.register('a', (c) => c.resolve('a'));
    container.register('b', () => 'ok');

    assert.throws(() => container.resolve('a'), CircularDependencyError);
    assert.equal(container.resolve('b'), 'ok');
  });
});
