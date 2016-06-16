'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       # SwitchCollection: A custom combinator for streams of collections
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       When a new collection is received in a stream of collections, usually it is an
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       updated instance of the previously-received collection, seeing as collection
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       instances are immutable. Instead of performing a naive switch operation
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       against sinks in each collection item, which would cause frequent cases of
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       unchanged streams being disposed and re-observed, state is maintained to keep
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       active streams alive if their status has not changed from one collection
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       instance to the next.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       The combinator is configured during construction to match one or more specific
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       sinks that it will monitor within each item in the active collection. Whenever
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       a new collection arrives from upstream, it is compared to the current active
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       collection (if any). The following operations are performed:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       1. Any matching streams in new collection items will be run and merged into
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          active downstream emissions.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       2. Streams from collection items that only exist in the previous collection
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          instance are disposed of and removed from the set of active sinks.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       3. Streams for collection items that exist in both the old and new versions of
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          the collection are compared for reference equality. If both items reference
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          the same stream, it is left as-is so as not to interrupt the active state
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          of the stream. If the stream reference is different, the old instance is
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          disposed and removed, and the new one is activated to replace the old one.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     */

exports.default = switchCollection;

var _most = require('most');

var _most2 = _interopRequireDefault(_most);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

var _diff = require('./diff');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultMissingSink = _most2.default.just(null);

function switchCollection(keys, list$) {
  if (!list$ || !list$.source) {
    throw new Error('The last argument to `switchCollection` must be a stream of collections');
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('The first argument to `switchCollection` must be an array with at least one key');
  }

  if (keys.some(function (key) {
    return typeof key !== 'string';
  })) {
    throw new Error('Every element in the `keys` argument must be a string');
  }

  return new _most2.default.Stream(new SwitchCollectionSource(keys, list$.source));
}

var SwitchCollectionSource = function () {
  function SwitchCollectionSource(keys, source) {
    _classCallCheck(this, SwitchCollectionSource);

    this._sinkKeys = keys;
    this.source = source;
  }

  _createClass(SwitchCollectionSource, [{
    key: 'run',
    value: function run(sink, scheduler) {
      var switchSink = new SwitchCollectionSink(this._sinkKeys, sink, scheduler);
      return this.source.run(switchSink, scheduler);
    }
  }]);

  return SwitchCollectionSource;
}();

var SwitchCollectionSink = function () {
  function SwitchCollectionSink(keys, sink, scheduler) {
    _classCallCheck(this, SwitchCollectionSink);

    this._sinkKeys = keys;
    this._sink = sink;
    this._scheduler = scheduler;
    this._state = new Map();
    this._list = (0, _index2.default)();
    this._active = true;
    this._disposed = false;
    this._activeCount = 0;
    this._ended = false;
    this._endValue = void 0;
  }

  _createClass(SwitchCollectionSink, [{
    key: '_getSinkState',
    value: function _getSinkState(key) {
      if (!this._state.has(key)) {
        this._state.set(key, new Map());
      }
      return this._state.get(key);
    }
  }, {
    key: '_getItemState',
    value: function _getItemState(sinkState, key) {
      if (!sinkState.has(key)) {
        sinkState.set(key, new Map());
      }
      return sinkState.get(key);
    }
  }, {
    key: '_run',
    value: function _run(sinkKey, itemKey, stream) {
      this._activeCount++;
      return new InnerSink(sinkKey, itemKey, this, this._scheduler, stream);
    }
  }, {
    key: '_remove',
    value: function _remove(sinkKey, itemKey) {
      var items = this._state.get(sinkKey);
      if (!items) {
        return;
      }
      var item = items.get(itemKey);
      if (!item) {
        return;
      }
      if (item.active) {
        this._activeCount--;
      }
      item.dispose();
      items.delete(itemKey);
      if (items.size === 0) {
        this._state.delete(sinkKey);
      }
    }
  }, {
    key: '_add',
    value: function _add(sinkKey, itemKey) {
      var items = this._state.get(sinkKey);
      if (!items) {
        items = new Map();
        this._state.set(sinkKey, items);
      } else if (items.has(itemKey)) {
        return this._check(sinkKey, itemKey);
      }
      var stream = getSink(itemKey, sinkKey, this._list);
      items.set(itemKey, this._run(sinkKey, itemKey, stream));
    }
  }, {
    key: '_update',
    value: function _update(sinkKey, itemKey) {
      var items = this._state.get(sinkKey);
      var item = items && items.get(itemKey);
      if (!item) {
        return this._add(sinkKey, itemKey); // shouldn't ever happen
      }
      var newStream = getSink(itemKey, sinkKey, this._list);

      if (item.isDifferentStream(newStream)) {
        if (item.active) {
          this._activeCount--;
        }
        item.dispose();
        items.set(itemKey, this._run(sinkKey, itemKey, newStream));
      }
    }
  }, {
    key: '_end',
    value: function _end(t) {
      if (this._ended && this._activeCount === 0) {
        this._active = false;
        this._sink.end(t, this._endValue); // only end when all internal streams have ended
      }
    }
  }, {
    key: 'eventInner',
    value: function eventInner(sinkKey, itemKey, t, x) {
      if (!this._active) {
        return;
      }
      this._sink.event(t, [itemKey, sinkKey, x]);
    }
  }, {
    key: 'endInner',
    value: function endInner(t) {
      if (!this._active) {
        return;
      }
      this._activeCount--;
      this._end(t);
    }
  }, {
    key: 'event',
    value: function event(t, list) {
      var _this = this;

      if (!this._active) {
        return;
      }
      var changes = (0, _diff.calculateDiff)(this._sinkKeys, this._list, list);
      this._list = list;
      if (changes) {
        this._sinkKeys.forEach(function (sinkKey) {
          changes.removed.forEach(function (_, itemKey) {
            _this._remove(sinkKey, itemKey);
          });
          changes.added.forEach(function (_, itemKey) {
            _this._add(sinkKey, itemKey);
          });
          changes.changed.forEach(function (_, itemKey) {
            _this._update(sinkKey, itemKey);
          });
        });
      }
      this._sink.event(t, { list: list, changes: changes });
    }
  }, {
    key: 'end',
    value: function end(t, x) {
      if (!this._active) {
        return;
      }
      this._endValue = x;
      this._ended = true;
      this._end(t);
    }
  }, {
    key: 'error',
    value: function error(t, e) {
      if (!this._active) {
        return;
      }
      this._active = false;
      this._sink.error(t, e);
    }
  }, {
    key: '_disposeState',
    value: function _disposeState() {
      this._state.forEach(function (items) {
        items.forEach(function (item) {
          return item.dispose();
        });
        items.clear();
      });
      this._state.clear();
    }
  }, {
    key: 'dispose',
    value: function dispose() {
      if (this._disposed) {
        return;
      }
      this._disposed = true;
      this._active = false;
      this._disposeState();
    }
  }]);

  return SwitchCollectionSink;
}();

var InnerSink = function () {
  function InnerSink(sinkKey, itemKey, sink, scheduler, stream) {
    _classCallCheck(this, InnerSink);

    this._sinkKey = sinkKey;
    this._itemKey = itemKey;
    this._sink = sink;
    this._scheduler = scheduler;
    this._disposed = false;
    this._active = true;
    this._activate(stream);
  }

  _createClass(InnerSink, [{
    key: '_activate',
    value: function _activate(stream) {
      this._stream = stream;
      this._disposable = this._stream.source.run(this, this._scheduler);
      this._disposed = false;
    }
  }, {
    key: 'isDifferentStream',
    value: function isDifferentStream(stream) {
      return this._stream !== stream;
    }
  }, {
    key: 'event',
    value: function event(t, x) {
      if (this._disposed) {
        return;
      }
      this._sink.eventInner(this._sinkKey, this._itemKey, t, x);
    }
  }, {
    key: 'end',
    value: function end(t, x) {
      if (this._disposed) {
        return;
      }
      this._active = false;
      this._sink.endInner(t);
      this.dispose();
    }
  }, {
    key: 'error',
    value: function error(t, e) {
      if (this._disposed) {
        return;
      }
      this._active = false;
      this._sink.error(t, e);
      this.dispose();
    }
  }, {
    key: 'dispose',
    value: function dispose() {
      if (this._disposed) {
        return;
      }
      this._disposable.dispose();
      this._disposed = true;
      this._active = false;
    }
  }, {
    key: 'active',
    get: function get() {
      return this._active;
    }
  }]);

  return InnerSink;
}();

function getSink(itemKey, sinkKey, list) {
  var item = list.get(itemKey);
  return item && item.sinks[sinkKey] || defaultMissingSink; // otherwise the sink will prevent snapshotting
}