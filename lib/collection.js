'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Collection = exports.componentTypeDefaults = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _most = require('most');

var _most2 = _interopRequireDefault(_most);

var _hold = require('@most/hold');

var _hold2 = _interopRequireDefault(_hold);

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _statics = require('./statics');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var nextListId = function () {
  var _id = 0;
  return function () {
    return 'list-item-' + ++_id;
  };
}();

function hasValue(value) {
  return value;
}

var emptyOrderedMap = _immutable2.default.OrderedMap();
var defaultCollectionState = _immutable2.default.Map({
  sources: {},
  types: emptyOrderedMap,
  items: emptyOrderedMap
});

var componentTypeDefaults = exports.componentTypeDefaults = {
  fn: function fn() {
    throw new Error('Component function not defined');
  },
  instantiate: function instantiate(input, type, list) {
    var sources = Object.assign({}, list.state.get('sources') || {}, type.sources || {}, input && (typeof input === 'undefined' ? 'undefined' : _typeof(input)) === 'object' ? input : {});
    return this.fn(sources);
  }
};

function defineComponent() {
  var arg0 = arguments[0];
  var key = void 0,
      type = void 0;
  if (typeof arg0 === 'string') {
    key = arg0;
    type = arguments[1];
  } else {
    type = arg0;
  }
  if (typeof type === 'function') {
    type = { fn: type };
  } else if (!type || (typeof type === 'undefined' ? 'undefined' : _typeof(type)) !== 'object') {
    throw new Error('A component function or options argument must be specified as argument 0 or 1');
  }
  if (key === void 0) {
    if ('key' in type) {
      key = type.key;
    } else if ('fn' in type) {
      key = type.fn.name;
    }
    if (key === void 0 || key === '') {
      key = '_default';
    }
  }
  return [key, Object.assign({ key: key }, componentTypeDefaults, type)];
}

function defineTypesFromArray(state, types) {
  return types.reduce(function (state, def) {
    var _defineComponent = defineComponent(def);

    var _defineComponent2 = _slicedToArray(_defineComponent, 2);

    var key = _defineComponent2[0];
    var type = _defineComponent2[1];

    return state.setIn(['types', key], type);
  }, state);
}

function defineTypesFromKeyMap(state, types) {
  return Object.keys(types).reduce(function (state, key) {
    var def = types[key];

    var _defineComponent3 = defineComponent(key, def);

    var _defineComponent4 = _slicedToArray(_defineComponent3, 2);

    var typeKey = _defineComponent4[0];
    var type = _defineComponent4[1];

    return state.setIn(['types', typeKey], type);
  }, state);
}

function defineTypes(state, types) {
  if (!types) {
    return state;
  }
  if ((typeof types === 'undefined' ? 'undefined' : _typeof(types)) !== 'object') {
    throw new Error('Collection options.types must be an array of types or an object of key:type pairs');
  }
  return Array.isArray(types) ? defineTypesFromArray(state, types) : defineTypesFromKeyMap(state, types);
}

function defineSources(state, sources) {
  if (!sources) {
    return state;
  }
  if ((typeof sources === 'undefined' ? 'undefined' : _typeof(sources)) !== 'object') {
    throw new Error('Collection options.sources must be an object of key:value pairs');
  }
  return state.set('sources', Object.assign({}, sources));
}

function isComponentDefinition(arg) {
  return typeof arg === 'function' || arg && (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object' && (typeof arg.fn === 'function' || typeof arg.instantiate === 'function');
}

function applyCollectionOptions(state, options) {
  if (!options) {
    return state;
  }
  if (isComponentDefinition(options)) {
    options = { types: [options] };
  } else if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) !== 'object') {
    throw new Error('Collection options must be an object or a component function');
  }
  return defineSources(defineTypes(state, options.types), options.sources);
}

function applyDefaultComponentType(state) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var _defineComponent5 = defineComponent.apply(undefined, args);

  var _defineComponent6 = _slicedToArray(_defineComponent5, 2);

  var typeKey = _defineComponent6[0];
  var type = _defineComponent6[1];

  return state.setIn(['types', typeKey], type);
}

var Collection = exports.Collection = function () {
  function Collection() {
    _classCallCheck(this, Collection);

    var arg0 = arguments[0];
    this.state = _immutable2.default.Map.isMap(arg0) ? arg0 : arguments.length === 1 ? applyCollectionOptions(defaultCollectionState, arg0) : arguments.length === 2 || typeof arg0 === 'function' ? applyDefaultComponentType.apply(undefined, [defaultCollectionState].concat(Array.prototype.slice.call(arguments))) : defaultCollectionState;
  }

  _createClass(Collection, [{
    key: '_getType',
    value: function _getType(typeKey, allowThrow) {
      var type = this.state.getIn(['types', typeKey]);
      if (allowThrow && !type) {
        throw new Error('Cannot set collection item; specified component type has not been defined');
      }
      return type;
    }
  }, {
    key: '_runComponent',
    value: function _runComponent(input, typeKey) {
      var type = this._getType(typeKey, true);
      var sinks = type.instantiate(input, type, this);
      return sinks;
    }
  }, {
    key: '_createItem',
    value: function _createItem(key, type, input, sinks) {
      if (key === void 0 || key === null) {
        throw new Error('Cannot set list item; no key was specified');
      }
      if (!sinks) {
        sinks = sinks || this._runComponent(input, type);
      }
      return { key: key, type: type, sinks: sinks, input: input };
    }
  }, {
    key: '_setItem',
    value: function _setItem(key, item) {
      var nextState = this.state.setIn(['items', key], item);
      return new Collection(nextState);
    }
  }, {
    key: '_getDefaultTypeKey',
    value: function _getDefaultTypeKey() {
      return this.state.get('types', emptyOrderedMap).keySeq().first();
    }
  }, {
    key: 'define',
    value: function define() {
      var _defineComponent7 = defineComponent.apply(undefined, arguments);

      var _defineComponent8 = _slicedToArray(_defineComponent7, 2);

      var typeKey = _defineComponent8[0];
      var type = _defineComponent8[1];

      var nextState = this.state.setIn(['types', typeKey], type);
      return new Collection(nextState);
    }
  }, {
    key: 'add',
    value: function add() {
      return this.set.apply(this, [nextListId()].concat(Array.prototype.slice.call(arguments)));
    }
  }, {
    key: 'addInstance',
    value: function addInstance(type, instance) {
      return this.setInstance.apply(this, [nextListId()].concat(Array.prototype.slice.call(arguments)));
    }
  }, {
    key: 'set',
    value: function set(key, type, input) {
      if (arguments.length <= 2) {
        input = type;
        type = this._getDefaultTypeKey();
      }
      var item = this._createItem(key, type, input);
      return this._setItem(key, item);
    }
  }, {
    key: 'setAt',
    value: function setAt(index, type, input) {
      if (arguments.length <= 2) {
        input = type;
        type = this._getDefaultTypeKey();
      }
      var key = this.state.get('items').keySeq().get(index);
      if (key === void 0) {
        throw new Error('Cannot set item at index ' + index + '; no item exists at that index');
      }
      var item = this._createItem(key, type, input);
      return this._setItem(key, item);
    }
  }, {
    key: 'setInstance',
    value: function setInstance(key, type, sinks) {
      if (arguments.length === 2) {
        sinks = type;
        type = void 0;
      }
      var item = this._createItem(key, type, void 0, sinks);
      return this._setItem(key, item);
    }
  }, {
    key: 'setInstanceAt',
    value: function setInstanceAt(index, type, sinks) {
      if (arguments.length === 2) {
        sinks = type;
        type = void 0;
      }
      var key = this.state.get('items').keySeq().get(index);
      if (key === void 0) {
        throw new Error('Cannot set item at index ' + index + '; no item exists at that index');
      }
      var item = this._createItem(key, type, void 0, sinks);
      return this._setItem(key, item);
    }
  }, {
    key: 'get',
    value: function get(key) {
      return this.state.getIn(['items', key]);
    }
  }, {
    key: 'getAt',
    value: function getAt(index) {
      return this.state.get('items').valueSeq().get(index);
    }
  }, {
    key: 'has',
    value: function has(key) {
      return this.state.hasIn(['items', key]);
    }
  }, {
    key: 'remove',
    value: function remove(key) {
      var state = this.state.deleteIn(['items', key]);
      return new Collection(state);
    }
  }, {
    key: 'removeAt',
    value: function removeAt(index) {
      var key = this.state.get('items').keySeq().get(index);
      var state = this.state.deleteIn(['items', key]);
      return new Collection(state);
    }
  }, {
    key: 'clear',
    value: function clear() {
      var state = this.state.set('items', emptyOrderedMap);
      return new Collection(state);
    }
  }, {
    key: 'merge',
    value: function merge(keysArg) {
      var _this = this;

      if (Array.isArray(keysArg)) {
        return keysArg.reduce(function (sinks, key) {
          return sinks[key] = _this.merge(key), sinks;
        }, {});
      }
      var items = this.state.get('items');
      var streams = items.valueSeq().map(function (item) {
        return item.sinks[keysArg];
      }).filter(hasValue).toArray();
      return _most2.default.mergeArray(streams);
    }
  }, {
    key: 'combineArray',
    value: function combineArray() {
      return _statics.combineArray.apply(undefined, Array.prototype.slice.call(arguments).concat([_most2.default.just(this)]));
    }
  }, {
    key: 'combineObject',
    value: function combineObject() {
      return _statics.combineObject.apply(undefined, Array.prototype.slice.call(arguments).concat([_most2.default.just(this)]));
    }
  }, {
    key: 'keys',
    value: function keys() {
      var items = this.state.get('items');
      return items.keys();
    }
  }, {
    key: 'entries',
    value: function entries() {
      var items = this.state.get('items');
      return items.entries();
    }
  }, {
    key: Symbol.iterator,
    value: function value() {
      var items = this.state.get('items');
      return items.values();
    }
  }, {
    key: 'size',
    get: function get() {
      return this.state.get('items').size;
    }
  }], [{
    key: '_extractStreamArray',
    value: function _extractStreamArray(key, list$) {
      return list$.switch().map(function (list) {
        return list.map(function (item) {
          return item.sinks[key];
        }).filter(hasValue);
      });
    }
  }, {
    key: 'combine',
    value: function combine(key, list$) {
      return _most2.default.combineArray(function () {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        return args;
      }, Collection._extractStreamArray(key, list$)).thru(_hold2.default);
    }
  }, {
    key: 'merge',
    value: function merge(key, list$) {
      if (Array.isArray(key)) {
        return Collection.sinks(key, list$);
      }
    }
  }, {
    key: 'sinks',
    value: function sinks(keys, list$) {
      return list$.switch().map(function (list) {
        return list.state.get('items').reduce(function (arrays, item) {
          return keys.reduce(function (acc, key) {
            return item.sinks[key] ? acc[key].push(item.sinks[key]) : void 0, acc;
          }, arrays);
        }, keys.reduce(function (acc, key) {
          return acc[key] = [], acc;
        }, {}));
      });
    }
  }]);

  return Collection;
}();