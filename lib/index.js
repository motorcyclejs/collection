'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Collection;

var _collection = require('./collection');

var _statics = require('./statics');

function Collection() {
  return new (Function.prototype.bind.apply(_collection.Collection, [null].concat(Array.prototype.slice.call(arguments))))();
};

Collection.merge = _statics.merge;
Collection.combineArray = _statics.combineArray;
Collection.combineObject = _statics.combineObject;
Collection.isCollection = _statics.isCollection;