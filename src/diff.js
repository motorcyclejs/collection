/*
  # calculateDiff()

  This function compares two collections and returns a changeset that specifies
  which items were removed, which ones were added, and of those that remained,
  whether their index in the collection has changed, and if any of their sinks
  have changed. Algorithmic complexity should be O(n).

  The first argument `sinkKeysWhitelist` is optional; pass a falsey value to
  include all sink keys in the comparison.
  
*/

export function calculateDiff(sinkKeysWhitelist, lastCollection, nextCollection) {
  const sinkKeysWhitelistSet = sinkKeysWhitelist && new Set(sinkKeysWhitelist);
  const changed = new Map();
  const removed = new Map();
  const added = new Map();  

  const itLast = lastCollection.entries();
  const itNext = nextCollection.entries();

  for(let currentLast = itLast.next(), currentNext = itNext.next(), index = 0;
      !currentNext.done || !currentLast.done;
      currentLast = itLast.next(), currentNext = itNext.next(), index++) {
    
    if(!currentLast.done) {
      const itemKey = currentLast.value[0];
      const item = {key: itemKey, index, sinks: currentLast.value[1].sinks};
      if(added.has(itemKey)) {
        const diff = compareItems(sinkKeysWhitelistSet, item, added.get(itemKey));
        added.delete(itemKey);
        if(diff) {
          changed.set(itemKey, diff);
        }
      }
      else {
        removed.set(itemKey, item);
      }
    }
    
    if(!currentNext.done) {
      const itemKey = currentNext.value[0];
      const item = {key: itemKey, index, sinks: currentNext.value[1].sinks};
      if(removed.has(itemKey)) {
        const diff = compareItems(sinkKeysWhitelistSet, removed.get(itemKey), item);
        removed.delete(itemKey);
        if(diff) {
          changed.set(itemKey, diff);
        }
      }
      else {
        const sinks = sinkKeysWhitelist ? pluck(sinkKeysWhitelist, item.sinks) : item.sinks;
        added.set(itemKey, {key: item.key, index: item.index, sinks});
      }
    }
  }
  
  if(added.size === 0 && removed.size === 0 && changed.size === 0) {
    return null;
  }

  return {added, removed, changed};
}

function pluck(keys, sinks) {
  const result = {};
  for(let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if(key in sinks) {
      result[key] = sinks[key];
    }
  }
  return result;
}

export function compareItems(sinkKeysWhitelistSet, last, next) {
  const changedSinks = compareSinks(sinkKeysWhitelistSet, last.sinks, next.sinks);
  const changedIndex = last.index !== next.index;
  const result = {};
  if(changedIndex) {
    result.index = next.index;
  }
  if(changedSinks) {
    result.sinks = changedSinks;
  }
  return changedSinks || changedIndex ? result : null;
}

export function compareSinks(sinkKeysWhitelistSet, lastSinks, nextSinks) {
  const changedSinks = [];
  for(let key in lastSinks) {
    if(sinkKeysWhitelistSet && !sinkKeysWhitelistSet.has(key)) {
      continue;
    }
    if(key in nextSinks) {
      // sink remains
      if(lastSinks[key] !== nextSinks[key]) {
        // sink has a different stream
        changedSinks.push([key, nextSinks[key]]);
      }
    }
    else {
      // sink removed
      changedSinks.push([key, null]);
    }
  }
  for(let key in nextSinks) {
    if(sinkKeysWhitelistSet && !sinkKeysWhitelistSet.has(key)) {
      continue;
    }
    if(!(key in lastSinks)) {
      // sink added
      changedSinks.push([key, nextSinks[key]]);
    }
  }
  return changedSinks.length ? changedSinks : null;
}