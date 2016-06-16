'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }(); /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           # Snapshot
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           Designed to process `switchCollection` events into snapshots of the latest
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           data available from a selected set of sinks. The output is emitted as a raw
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           array containing the metadata of each snapshotted value, including the
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           relevant item key, item index, and sinks snapshot which in turn maps sink keys
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           to the latest value emitted by each sink.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           Like `most.combine`, no data is emitted until every active stream has emitted
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           data at least once. If an item containing non-emitting streams is removed from
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           a collection, leaving only streams that have each already emitted data, then,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           assuming that a resultant emission was pending, it will be triggered
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           immediately. Similarly, if an item is added to a collection, further emissions
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           will not occur until the new stream(s) emit their first item(s) of data.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         */

exports.default = snapshot;

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function snapshot(stream) {
  return stream.loop(applySwitchCollectionEvent, {
    initial: true,
    pending: new Map(), // {[itemKey]: Set({sinkKey, ...}), ...}
    values: _immutable2.default.OrderedMap() // {[itemKey]: {itemKey, index, sinks: {[sinkKey]: value, ...}}, ...}
  }).filter(function (ev) {
    return ev;
  });
}

function applySwitchCollectionEvent(state, event) {
  var mutate = Array.isArray(event) ? applyDataEventToState : applyListChangesToState;

  var oldValues = state.values;
  mutate(state, event);
  var canEmit = state.pending.size === 0 && (state.initial || !_immutable2.default.is(oldValues, state.values));
  delete state.initial;

  return {
    seed: state,
    value: canEmit ? state.values : null
  };
}

function applyListChangesToState(state, event) {
  if (!event.changes) {
    return;
  }

  var _event$changes = event.changes;
  var added = _event$changes.added;
  var removed = _event$changes.removed;
  var changed = _event$changes.changed;


  added.forEach(function (_ref, itemKey) {
    var sinks = _ref.sinks;
    var index = _ref.index;
    return addItem(state, itemKey, sinks, index);
  });
  changed.forEach(function (_ref2, itemKey) {
    var sinks = _ref2.sinks;
    var index = _ref2.index;
    return updateItem(state, itemKey, sinks, index);
  });
  removeItems(state, removed);

  state.values = state.values.sort(function (a, b) {
    return a.get('index') - b.get('index');
  });
}

function applyDataEventToState(state, _ref3) {
  var _ref4 = _slicedToArray(_ref3, 3);

  var itemKey = _ref4[0];
  var sinkKey = _ref4[1];
  var data = _ref4[2];

  setSinkResolved(state, itemKey, sinkKey);
  state.values = state.values.setIn([itemKey, 'sinks', sinkKey], data);

  return {
    seed: state,
    value: nextEmission(state)
  };
}

function nextEmission(state) {
  return state.pending.size === 0 ? null : state.values;
}

function addItem(state, itemKey, sinks, index) {
  for (var sinkKey in sinks) {
    setSinkPending(state, itemKey, sinkKey);
  }
  state.values = state.values.mergeDeepIn([itemKey], { itemKey: itemKey, index: index, sinks: {} });
}

function removeItems(state, removed) {
  var values = state.values;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = removed.keys()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var key = _step.value;

      state.values = values.delete(key);
      state.pending.delete(key);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

function updateItem(state, itemKey, changedSinks, index) {
  if (index !== void 0) {
    state.values = state.values.setIn([itemKey, 'index'], index);
  }

  if (changedSinks) {
    for (var i = 0; i < changedSinks.length; i++) {
      var _changedSinks$i = _slicedToArray(changedSinks[i], 2);

      var sinkKey = _changedSinks$i[0];
      var stream = _changedSinks$i[1];

      if (stream) {
        // stream changed
        setSinkPending(state, itemKey, sinkKey);
      } else {
        // stream removed
        setSinkResolved(state, itemKey, sinkKey);
      }
    }
  }
}

function setSinkResolved(state, itemKey, sinkKey) {
  if (!state.pending.has(itemKey)) {
    return;
  }
  var set = state.pending.get(itemKey);
  if (!set.has(sinkKey)) {
    return;
  }
  set.delete(sinkKey);
  if (set.size === 0) {
    state.pending.delete(itemKey);
  }
}

function setSinkPending(state, itemKey, sinkKey) {
  if (!state.pending.has(itemKey)) {
    state.pending.set(itemKey, new Set());
  }
  var set = state.pending.get(itemKey);
  set.add(sinkKey);
}