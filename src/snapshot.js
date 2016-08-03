/*
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

import most from 'most';
import Immutable from 'immutable';
import {isStream, placeholderSymbol} from './common';

export default function snapshot() {
  const lastArg = arguments[arguments.length - 1];
  if(isStream(lastArg)) {
    const keys = arguments.length > 1 ? keysFromArgs(Array.prototype.slice.call(arguments, 0, arguments.length - 1)) : null;
    return createSnapshotStream(keys, lastArg);
  }
  else {
    const keys = keysFromArgs(arguments);
    return stream => createSnapshotStream(keys, stream);
  }
}

function keysFromArgs(args) {
  return Array.isArray(args[0]) ? args[0] : Array.from(args);
}

function alwaysTrue() {
  return true;
}

function createSnapshotStream(sinkKeys, switchCollectionStream) {
  if(sinkKeys && !Array.isArray(sinkKeys)) {
    sinkKeys = [sinkKeys];
  }
  const makeDefaults = sinkKeys ? () => sinkKeys.reduce((v, k) => (v[k] = void 0, v), {}) : () => ({});
  const whitelist = sinkKeys && new Set(sinkKeys);
  const isValid = whitelist ? key => whitelist.has(key) : alwaysTrue;
  const filteredStream = switchCollectionStream
    .loop(applySwitchCollectionEvent(isValid, makeDefaults), {
      initial: true,
      pending: new Map(), // {[itemKey]: Set({sinkKey, ...}), ...}
      values: Immutable.OrderedMap() // {[itemKey]: {itemKey, index, sinks: {[sinkKey]: value, ...}}, ...}
    })
    .filter(ev => ev);
  return new SnapshotStream(filteredStream.source);
}

class SnapshotStream extends most.Stream
{
  constructor(source) {
    super(source);
  }
}

function applySwitchCollectionEvent(isValidSinkKey, makeDefaultSinkValues) {
  return (state, event) => {
    const mutate = Array.isArray(event)
      ? applyDataEventToState
      : applyListChangesToState;
    
    const oldValues = state.values;
    const accepted = mutate(state, event, isValidSinkKey, makeDefaultSinkValues);
    const canEmit = accepted && state.pending.size === 0 && (state.initial || !Immutable.is(oldValues, state.values));
    delete state.initial;

    return {
      seed: state,
      value: canEmit ? state.values : null
    };
  };
}

function applyListChangesToState(state, event, isValidSinkKey, makeDefaultSinkValues) {
  if(!event.changes) {
    return true;
  }

  const {added, removed, changed} = event.changes;
  let accepted = added.size > 0 || removed.size > 0;

  added.forEach(({sinks, index}, itemKey) => addItem(state, itemKey, sinks, index, makeDefaultSinkValues()));
  changed.forEach(({sinks, index}, itemKey) => {
    if(updateItem(state, itemKey, sinks, index, isValidSinkKey) && !accepted) {
      accepted = true;
    }
  });
  removeItems(state, removed);
  
  state.values = state.values.sort((a, b) => a.get('index') - b.get('index'));
  
  return accepted;
}

const valueOf = data => data === placeholderSymbol ? void 0 : data;

function applyDataEventToState(state, [itemKey, sinkKey, data], isValidSinkKey) {
  if(!isValidSinkKey(sinkKey)) {
    return false;
  }
  setSinkResolved(state, itemKey, sinkKey);
  state.values = state.values.setIn([itemKey, 'sinks', sinkKey], valueOf(data));
  return true;
}

function addItem(state, itemKey, sinks, index, defaultSinkValues) {
  for(let sinkKey in sinks) {
    setSinkPending(state, itemKey, sinkKey);
  }
  state.values = state.values.mergeDeepIn([itemKey], {itemKey, index, sinks: defaultSinkValues});
}

function removeItems(state, removed) {
  for(let key of removed.keys()) {
    state.values = state.values.delete(key);
    state.pending.delete(key);
  }
}

function updateItem(state, itemKey, changedSinks, index, isValidSinkKey) {
  let accepted = false;

  if(index !== void 0) {
    state.values = state.values.setIn([itemKey, 'index'], index);
    accepted = true;
  }
  
  if(changedSinks) {
    for(let i = 0; i < changedSinks.length; i++) {
      const [sinkKey, stream] = changedSinks[i];
      if(!isValidSinkKey(sinkKey)) {
        continue;
      }
      accepted = true;
      if(stream) { // stream changed
        setSinkPending(state, itemKey, sinkKey);
      }
      else { // stream removed
        setSinkResolved(state, itemKey, sinkKey);
      }
    }
  }

  return accepted;
}

function setSinkResolved(state, itemKey, sinkKey) {
  if(!state.pending.has(itemKey)) {
    return;
  }
  const set = state.pending.get(itemKey);
  if(!set.has(sinkKey)) {
    return;
  }
  set.delete(sinkKey);
  if(set.size === 0) {
    state.pending.delete(itemKey);
  }
}

function setSinkPending(state, itemKey, sinkKey) {
  if(!state.pending.has(itemKey)) {
    state.pending.set(itemKey, new Set());
  }
  const set = state.pending.get(itemKey);
  set.add(sinkKey);
}