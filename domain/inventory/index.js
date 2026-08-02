'use strict';

const { Product, InsufficientStockError } = require('./entities/Product');
const { Sku } = require('./value-objects/Sku');
const { Quantity } = require('./value-objects/Quantity');
const { StockLevelService } = require('./services/StockLevelService');
const { StockDepletedEvent } = require('./events/StockDepletedEvent');

module.exports = {
  Product,
  InsufficientStockError,
  Sku,
  Quantity,
  StockLevelService,
  StockDepletedEvent,
};
