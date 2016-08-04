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

const emptyMap = Immutable.Map();
const emptySet = Immutable.Set();

export default class Snapshot
{
  constructor(state) {
    this.state = state;
  }

  static create(sinkKeys) {
    const state = Immutable.Map({
      sinkKeys: sinkKeys && Immutable.Set(sinkKeys),
      pending: emptyMap,
      values: emptyMap
    });
    return new Snapshot(state);
  }

  get sinkKeys() {
    return this.state.get('sinkKeys');
  }

  get hasPendingData() {
    return this.state.getIn(['pending', 'sinks'], emptySet).size > 0;
  }

  applyChanges({added, removed, changed}) {
    const snapshot = new MutableSnapshot(this.state);
    snapshot.addItems(added);
    snapshot.updateItems(changed);
    snapshot.removeItems(removed);
    return new Snapshot(snapshot.state);
  }
  
  setData([itemKey, sinkKey, data]) {
    const snapshot = new MutableSnapshot(this.state);
    snapshot.updateData(itemKey, sinkKey, data);
    return new Snapshot(snapshot.state);
  }
}

const valueOf = data => data === placeholderSymbol ? void 0 : data;

class MutableSnapshot
{
  constructor(state) {
    this.state = state;
  }

  _makeDefaultValues(key, index) {
    const sinkKeys = this.get('sinkKeys');
    const values = {key, index};
    const defaults = sinkKeys ? sinkKeys.reduce((v, k) => (v[k] = void 0, v), values) : values;
    return Immutable.Map(defaults);
  }

  addItems(added) {
    if(!added) return;
    this.state.update('values', values => {
      added.forEach(({sinks, index}, itemKey) => {
        for(let sinkKey in sinks) {
          this.setSinkPending(itemKey, sinkKey);
        }
        values = values.set(itemKey, this._makeDefaultValues(itemKey, index));
      });
      return values;
    });
  }

  _updateItem(itemKey, changedSinks, index) {
    if(index !== void 0) {
      this.state = this.state.setIn(['values', itemKey, 'index'], index);
    }
    
    if(changedSinks) {
      for(let i = 0; i < changedSinks.length; i++) {
        const [sinkKey, stream] = changedSinks[i];
        if(stream) { // stream changed
          this.setSinkPending(itemKey, sinkKey);
        }
        else { // stream removed
          this.setSinkResolved(itemKey, sinkKey);
        }
      }
    }
  }

  updateItems(changed) {
    if(!changed) return;
    changed.forEach(({sinks, index}, itemKey) =>
      this._updateItem(itemKey, sinks, index));
  }

  removeItems(removed) {
    if(!removed) return;
    let values = this.state.get('values');
    for(let key of removed.keys()) {
      values = values.delete(key);
      this.state.getIn(['pending', 'items', key])
        .forEach(sinkKey => this.state.setSinkResolved(key, sinkKey));
    }
    this.state = this.state.set('values', values);
  }

  updateData(itemKey, sinkKey, data) {
    this.setSinkResolved(itemKey, sinkKey);
    this.state = this.state.setIn(['values', itemKey, sinkKey], valueOf(data));
  }

  setSinkPending(itemKey, sinkKey) {
    this.state = this.state.updateIn(['snapshot', 'pending'], pending => pending
      .updateIn(['items', itemKey], emptySet, keys => keys.add(sinkKey))
      .updateIn(['sinks', sinkKey], emptySet, keys => keys.add(itemKey)));
  }

  setSinkResolved(itemKey, sinkKey) {
    this.state = this.state
      .updateIn(['snapshot', 'pending'], pending => {
        const items = pending
          .get('items', emptyMap)
          .update(items => {
            let sinkKeys = items.get(itemKey);
            if(!sinkKeys) return items;
            sinkKeys = sinkKeys.delete(sinkKey);
            return sinkKeys.size
              ? items.set(itemKey, sinkKeys)
              : items.delete(itemKey);
          });

        const sinks = pending
          .get('sinks', emptyMap)
          .update(sinks => {
            let itemKeys = sinks.get(sinkKey);
            if(!itemKeys) return sinks;
            itemKeys = itemKeys.delete(itemKey);
            return itemKeys.size
              ? sinks.set(sinkKey, itemKeys)
              : sinks.delete(sinkKey);
          });
        
        return pending
          .set('items', items)
          .set('sinks', sinks);
      });
  }
}
