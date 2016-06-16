'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = merge;
exports.combineArray = combineArray;
exports.combineObject = combineObject;
exports.isCollection = isCollection;

var _most = require('most');

var _most2 = _interopRequireDefault(_most);

var _common = require('./common');

var _collection = require('./collection');

var _snapshot = require('./snapshot');

var _snapshot2 = _interopRequireDefault(_snapshot);

var _switchCollection = require('./switch-collection');

var _switchCollection2 = _interopRequireDefault(_switchCollection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function merge() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return (0, _common.isSinks)(args[0]) ? mergeSinks.apply(undefined, args) : exec(mergeSimple, mergeGrouped, args);
}

function combineArray() {
  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  return exec(combineArraySimple, combineArrayGrouped, args);
}

function combineObject() {
  for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    args[_key3] = arguments[_key3];
  }

  return exec(combineObjectSimple, combineObjectGrouped, args);
}

function isCollection(arg) {
  return arg instanceof _collection.Collection;
}

function exec(keyFn, keysFn, args) {
  var list$ = args[args.length - 1];
  if (!(0, _common.isStream)(list$)) {
    throw new Error('The last argument should be a stream of collections');
  }
  if (args.length < 2) {
    throw new Error('Expected at least two arguments; the last should be a ' + 'stream of collections and either the first should be an ' + 'array of keys, or the last argument should be preceded by ' + 'one or more string arguments, each referencing a key');
  }
  if (Array.isArray(args[0])) {
    return keysFn(args[0], list$);
  }
  if (args.length > 2) {
    return keysFn(args.slice(0, args.length - 1));
  }
  return keyFn(args[0], list$);
}

function mergeSinks() {
  for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    args[_key4] = arguments[_key4];
  }

  return args.reduce(function (sinks, arg) {
    for (var key in arg || {}) {
      sinks[key] = sinks[key] ? sinks[key] = _most2.default.merge(sinks[key], arg[key]) : arg[key];
    }
    return sinks;
  }, {});
}

function mergeSimple(key, list$) {
  return list$.map(function (list) {
    return list.merge(key);
  }).switch();
};

function mergeGrouped(keys, list$) {
  return keys.reduce(function (sinks, key) {
    return sinks[key] = mergeSimple(key, list$), sinks;
  }, {});
};

function combineArraySimple(key, list$) {
  return (0, _snapshot2.default)((0, _switchCollection2.default)([key], list$)).map(function (values) {
    return values.map(function (m) {
      return m.getIn(['sinks', key]);
    }).toArray();
  });
}

function combineArrayGrouped(keys, list$) {
  return (0, _snapshot2.default)((0, _switchCollection2.default)(keys, list$)).map(function (values) {
    return values.map(function (m) {
      var item = {};
      for (var i = 0; i < keys.length; i++) {
        item[keys[i]] = m.getIn(['sinks', keys[i]]);
      }
      return item;
    }).toArray();
  });
}

function combineObjectSimple(key, list$) {
  return (0, _snapshot2.default)((0, _switchCollection2.default)([key], list$)).map(function (values) {
    return values.reduce(function (acc, m) {
      return acc[m.get('itemKey')] = m.getIn(['sinks', key]), acc;
    }, {});
  });
}

function combineObjectGrouped(keys, list$) {
  return (0, _snapshot2.default)((0, _switchCollection2.default)(keys, list$)).map(function (values) {
    return values.reduce(function (acc, m) {
      return acc[m.get('itemKey')] = keys.reduce(function (obj, key) {
        return obj[key] = m.getIn(['sinks', key]), obj;
      }, {}), acc;
    }, {});
  });
}