"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateDiff = calculateDiff;
exports.compareItems = compareItems;
exports.compareSinks = compareSinks;
function calculateDiff(sinkKeysWhitelist, lastCollection, nextCollection) {
  var sinkKeysWhitelistSet = sinkKeysWhitelist && new Set(sinkKeysWhitelist);
  var changed = new Map();
  var removed = new Map();
  var added = new Map();

  var itLast = lastCollection.entries();
  var itNext = nextCollection.entries();

  for (var currentLast = itLast.next(), currentNext = itNext.next(), index = 0; !currentNext.done || !currentLast.done; currentLast = itLast.next(), currentNext = itNext.next(), index++) {

    if (!currentLast.done) {
      var itemKey = currentLast.value[0];
      var item = { key: itemKey, index: index, sinks: currentLast.value[1].sinks };
      if (added.has(itemKey)) {
        var diff = compareItems(sinkKeysWhitelistSet, item, added.get(itemKey));
        added.delete(itemKey);
        if (diff) {
          changed.set(itemKey, diff);
        }
      } else {
        removed.set(itemKey, item);
      }
    }

    if (!currentNext.done) {
      var _itemKey = currentNext.value[0];
      var _item = { key: _itemKey, index: index, sinks: currentNext.value[1].sinks };
      if (removed.has(_itemKey)) {
        var _diff = compareItems(sinkKeysWhitelistSet, removed.get(_itemKey), _item);
        removed.delete(_itemKey);
        if (_diff) {
          changed.set(_itemKey, _diff);
        }
      } else {
        var sinks = sinkKeysWhitelist ? pluck(sinkKeysWhitelist, _item.sinks) : _item.sinks;
        added.set(_itemKey, { key: _item.key, index: _item.index, sinks: sinks });
      }
    }
  }

  if (added.size === 0 && removed.size === 0 && changed.size === 0) {
    return null;
  }

  return { added: added, removed: removed, changed: changed };
}

function pluck(keys, sinks) {
  var result = {};
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key in sinks) {
      result[key] = sinks[key];
    }
  }
  return result;
}

function compareItems(sinkKeysWhitelistSet, last, next) {
  var changedSinks = compareSinks(sinkKeysWhitelistSet, last.sinks, next.sinks);
  var changedIndex = last.index !== next.index;
  var result = {};
  if (changedIndex) {
    result.index = next.index;
  }
  if (changedSinks) {
    result.sinks = changedSinks;
  }
  return changedSinks || changedIndex ? result : null;
}

function compareSinks(sinkKeysWhitelistSet, lastSinks, nextSinks) {
  var changedSinks = [];
  for (var key in lastSinks) {
    if (sinkKeysWhitelistSet && !sinkKeysWhitelistSet.has(key)) {
      continue;
    }
    if (key in nextSinks) {
      // sink remains
      if (lastSinks[key] !== nextSinks[key]) {
        // sink has a different stream
        changedSinks.push([key, nextSinks[key]]);
      }
    } else {
      // sink removed
      changedSinks.push([key, null]);
    }
  }
  for (var _key in nextSinks) {
    if (sinkKeysWhitelistSet && !sinkKeysWhitelistSet.has(_key)) {
      continue;
    }
    if (!(_key in lastSinks)) {
      // sink added
      changedSinks.push([_key, nextSinks[_key]]);
    }
  }
  return changedSinks.length ? changedSinks : null;
}