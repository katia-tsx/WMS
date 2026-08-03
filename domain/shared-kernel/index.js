'use strict';

const { Entity } = require('./entities/Entity');
const { AggregateRoot } = require('./entities/AggregateRoot');
const { ValueObject } = require('./value-objects/ValueObject');
const { DomainEvent } = require('./events/DomainEvent');
const {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
} = require('./errors/DomainError');
const { Result, Ok, Err } = require('./result/Result');
const { Guard } = require('./guard/Guard');

module.exports = {
  Entity,
  AggregateRoot,
  ValueObject,
  DomainEvent,
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
  Result,
  Ok,
  Err,
  Guard,
};
