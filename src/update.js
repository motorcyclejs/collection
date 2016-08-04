import most from 'most';
import hold from '@most/hold';
import dispatch from 'most-dispatch';

import {stub} from './common';
import {isCollection} from './statics';
import {Collection} from './collection';
import {switchCollection} from './switch-collection';
import {applyChangeSetData, applySnapshotData} from './snapshot';

export default function update(fn, collectionArg) {
  const initialCollection = collectionArg
    ? isCollection(collectionArg)
      ? collectionArg
      : new Collection(collectionArg)
    : Collection(); 
  
  return stream => {
    const data$ = stub();
    const changes$ = stub();
    const collection$ = most
      .mergeArray([
        data$.map(createMappingFunction(applySnapshotData)),
        changes$.map(createMappingFunction(applyChangeSetData)),
        stream.map(createMappingFunction(wrapUserFunction(fn)))
      ])
      .loop(applyChange, initialCollection)
      .multicast();
    
    const switched$ = collection$
      .filter(shouldRecalculate)
      .map(toCollection)
      .thru(switchCollection(initialCollection.snapshot.sinkKeys));

    changes$.fulfill(switched$.changeSets());
    data$.fulfill(switched$.events());

    return collection$
      .filter(shouldPublish)
      .map(toCollection)
      .thru(hold);
  };
}

function shouldRecalculate({recalculate}) {
  return recalculate;
}

function shouldPublish({publish}) {
  return publish;
}

function toCollection({collection}) {
  return collection;
}

function wrapUserFunction(fn) {
  return function() {
    const result = fn.apply(null, arguments);
    return [false, true, result];
  };
}

function createMappingFunction(fn) {
  return (collection, data) => {
    const result = fn(collection, data);
    return {
      seed: result && result[2] || collection,
      value: result
    };
  };
}

function applyChange(collection, [fn, data]) {
  const [recalculate, publish, updatedCollection] = fn(collection, data);
  return {
    seed: updatedCollection || collection,
    value: {recalculate, publish, collection: updatedCollection}
  };
}

function applySnapshotData(collection, data) {
  const snapshot = collection.snapshot.setData(data);
  const updatedCollection = collection.updateSnapshot(snapshot);
  const isPending = snapshot.hasPendingData;
  return [
    false, !isPending,
    updatedCollection
  ];
}

function applyChangeSetData(collection, data) {
  const snapshot = collection.snapshot.applyChanges(data.changes);
  const updatedCollection = collection.updateSnapshot(snapshot);
  const isPending = snapshot.hasPendingData;
  return [
    !isPending, false,
    updatedCollection
  ];
}
