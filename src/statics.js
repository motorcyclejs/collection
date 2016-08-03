import Immutable from 'immutable';
import most from 'most';
import {isStream, isSinks} from './common';
import {Collection} from './collection';
import snapshot from './snapshot';
import switchCollection from './switch-collection';
import {placeholderSymbol} from './common';

export function merge(...args) {
  return isSinks(args[0])
    ? mergeSinks(...args)
    : exec(mergeSingle, mergeMultiple, args);
}

export function combineArray(...args) {
  return exec(combineArraySingle, combineArrayMultiple, args);
}

export function combineObject(...args) {
  return exec(combineObjectSingle, combineObjectMultiple, args);
}

export function combineImmutable(...args) {
  return exec(combineImmutableSingle, combineImmutableMultiple, args);
}

export function switchNext(...args) {
  return exec(switchSingle, switchMultiple, args);
}

export function isCollection(arg) {
  return arg instanceof Collection;
}

export function areCollectionsEqual(a, b) {
  return Immutable.is(a.state, b.state);
}

export function areCollectionItemsEqual(a, b) {
  return Immutable.is(a.state.get('items'), b.state.get('items'));
}

function exec(keyFn, keysFn, args) {
  const list$ = args[args.length - 1];
  if(!isStream(list$)) {
    throw new Error('The last argument should be a stream of collections');
  }
  if(args.length < 2) {
    throw new Error('Expected at least two arguments; the last should be a '
                  + 'stream of collections and either the first should be an '
                  + 'array of keys, or the last argument should be preceded by '
                  + 'one or more string arguments, each referencing a key');
  }
  if(Array.isArray(args[0])) {
    return keysFn(args[0], list$);
  }
  if(args.length > 2) {
    return keysFn(args.slice(0, args.length - 1));
  }
  return keyFn(args[0], list$);
}

function mergeSinks(...args) {
  return args.reduce((sinks, arg) => {
    for(let key in arg || {}) {
      sinks[key] = sinks[key]
        ? sinks[key] = most.merge(sinks[key], arg[key])
        : arg[key];
    }
    return sinks;
  }, {});
}

function mergeSingle(key, list$) {
  return switchCollection([key], list$)
    .filter(Array.isArray)
    .map(ev => ev[2])
    .filter(value => value !== placeholderSymbol);
};

function mergeMultiple(keys, list$) {
  return keys.reduce((sinks, key) =>
    ((sinks[key] = mergeSingle(key, list$)), sinks), {});
};

function combineArraySingle(key, list$) {
  return snapshot(switchCollection([key], list$))
    .map(values => values.map(m => m.getIn(['sinks', key])).toArray());
}

function combineArrayMultiple(keys, list$) {
  return snapshot(switchCollection(keys, list$))
    .map(values => values.map(m => {
      const item = {};
      for(let i = 0; i < keys.length; i++) {
        item[keys[i]] = m.getIn(['sinks', keys[i]]);
      }
      return item;
    }).toArray());
}

function combineObjectSingle(key, list$) {
  return snapshot(switchCollection([key], list$))
    .map(values =>
      values.reduce((acc, m) =>
        ((acc[m.get('itemKey')] = m.getIn(['sinks', key])), acc), {}));
}

function combineObjectMultiple(keys, list$) {
  return snapshot(switchCollection(keys, list$))
    .map(values =>
      values.reduce((acc, m) =>
        ((acc[m.get('itemKey')] = keys.reduce((obj, key) =>
          ((obj[key] = m.getIn(['sinks', key])), obj), {})), acc), {}));
}

function combineImmutableSingle(key, list$) {
  return snapshot(switchCollection([key], list$));
}

function combineImmutableMultiple(keys, list$) {
  return snapshot(switchCollection(keys, list$));
}

function switchSingle(key, list$) {
  return switchCollection([key], list$);
}

function switchMultiple(keys, list$) {
  return switchCollection(keys, list$);
}