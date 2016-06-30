import Immutable from 'immutable';
import most from 'most';
import {isStream, isSinks} from './common';
import {Collection} from './collection';
import snapshot from './snapshot';
import switchCollection from './switch-collection';

export function merge(...args) {
  return isSinks(args[0])
    ? mergeSinks(...args)
    : exec(mergeSimple, mergeGrouped, args);
}

export function combineArray(...args) {
  return exec(combineArraySimple, combineArrayGrouped, args);
}

export function combineObject(...args) {
  return exec(combineObjectSimple, combineObjectGrouped, args);
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

function mergeSimple(key, list$) {
  return list$
    .map(list => list.merge(key))
    .switch();
};

function mergeGrouped(keys, list$) {
  return keys.reduce((sinks, key) =>
    ((sinks[key] = mergeSimple(key, list$)), sinks), {});
};

function combineArraySimple(key, list$) {
  return snapshot(switchCollection([key], list$))
    .map(values => values.map(m => m.getIn(['sinks', key])).toArray());
}

function combineArrayGrouped(keys, list$) {
  return snapshot(switchCollection(keys, list$))
    .map(values => values.map(m => {
      const item = {};
      for(let i = 0; i < keys.length; i++) {
        item[keys[i]] = m.getIn(['sinks', keys[i]]);
      }
      return item;
    }).toArray());
}

function combineObjectSimple(key, list$) {
  return snapshot(switchCollection([key], list$))
    .map(values =>
      values.reduce((acc, m) =>
        ((acc[m.get('itemKey')] = m.getIn(['sinks', key])), acc), {}));
}

function combineObjectGrouped(keys, list$) {
  return snapshot(switchCollection(keys, list$))
    .map(values =>
      values.reduce((acc, m) =>
        ((acc[m.get('itemKey')] = keys.reduce((obj, key) =>
          ((obj[key] = m.getIn(['sinks', key])), obj), {})), acc), {}));
}
