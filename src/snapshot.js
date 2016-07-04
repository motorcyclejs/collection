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

import Immutable from 'immutable';
import {placeholderSymbol} from './common';

export default function snapshot(stream) {
  return stream.loop(applySwitchCollectionEvent, {
    initial: true,
    pending: new Map(), // {[itemKey]: Set({sinkKey, ...}), ...}
    values: Immutable.OrderedMap() // {[itemKey]: {itemKey, index, sinks: {[sinkKey]: value, ...}}, ...}
  })
  .filter(ev => ev);
}

function applySwitchCollectionEvent(state, event) {
  const mutate = Array.isArray(event)
    ? applyDataEventToState
    : applyListChangesToState;
  
  const oldValues = state.values;
  mutate(state, event);
  const canEmit = state.pending.size === 0 && (state.initial || !Immutable.is(oldValues, state.values));
  delete state.initial;

  return {
    seed: state,
    value: canEmit ? state.values : null
  };
}

function applyListChangesToState(state, event) {
  if(!event.changes) {
    return;
  }

  const {added, removed, changed} = event.changes;

  added.forEach(({sinks, index}, itemKey) => addItem(state, itemKey, sinks, index));
  changed.forEach(({sinks, index}, itemKey) => updateItem(state, itemKey, sinks, index));
  removeItems(state, removed);
  
  state.values = state.values.sort((a, b) => a.get('index') - b.get('index'));
}

const valueOf = data => data === placeholderSymbol ? void 0 : data;

function applyDataEventToState(state, [itemKey, sinkKey, data]) {
  setSinkResolved(state, itemKey, sinkKey);
  state.values = state.values.setIn([itemKey, 'sinks', sinkKey], valueOf(data));

  return {
    seed: state,
    value: nextEmission(state)
  };
}

function nextEmission(state) {
  return state.pending.size === 0 ? null : state.values;
}

function addItem(state, itemKey, sinks, index) {
  for(let sinkKey in sinks) {
    setSinkPending(state, itemKey, sinkKey);
  }
  state.values = state.values.mergeDeepIn([itemKey], {itemKey, index, sinks: {}});
}

function removeItems(state, removed) {
  for(let key of removed.keys()) {
    state.values = state.values.delete(key);
    state.pending.delete(key);
  }
}

function updateItem(state, itemKey, changedSinks, index) {
  if(index !== void 0) {
    state.values = state.values.setIn([itemKey, 'index'], index);
  }
  
  if(changedSinks) {
    for(let i = 0; i < changedSinks.length; i++) {
      const [sinkKey, stream] = changedSinks[i];
      if(stream) { // stream changed
        setSinkPending(state, itemKey, sinkKey);
      }
      else { // stream removed
        setSinkResolved(state, itemKey, sinkKey);
      }
    }
  }
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