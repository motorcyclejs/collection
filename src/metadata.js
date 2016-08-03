import most from 'most';
import hold from '@most/hold';
import dispatch from 'most-dispatch';

import {Collection} from './collection';
import {switchCollection} from './switch-collection';

function selectKey(event) {
  return event.key;
}

function selectIndex(event) {
  return event.diff ? event.diff.index : event.item.index;
}

function hasIndex(event) {
  return !event.diff || 'index' in event.diff;
}

function hasDiffIndex(event) {
  return event.diff && 'index' in event.diff;
}

function selectDiffIndex(event) {
  return event.diff.index;
}

function selectListCount(list) {
  return list.size;
}

function emitMetadata(key, dispatch$) {
  // count$
  // index$
  // previousSibling$
  // nextSibling$

  const metadata$ = dispatch$.select(key).multicast();
}

class MetadataBuilder
{
  constructor(list$, dispatchByKey$, dispatchByIndex$) {
    this.list$ = list$;
    this.total$ = list$
      .map(selectListCount)
      .skipRepeats()
      .thru(hold); 
    this.dispatchByKey$ = dispatchByKey$;
    this.dispatchByIndex$ = dispatchByIndex$;
  }

  create(list, key, index) {
    const indexChanged$ = this.dispatchByKey$
      .select(key)
      .filter(hasDiffIndex)
      .multicast();

    
    const index$ = indexChanged$
      .map(selectDiffIndex)
      .startWith(index)
      .thru(hold);

    // if my index changes, reselect both siblings
    // if the item at the previous index changes, reselect the previous sibling
    // if the item at the next index changes, reselect the next sibling

    const siblings$ = indexChanged$
      .map(event => {
        const index = event.diff.index;
        const prevIndex = index - 1;
        const nextIndex = index + 1;
        
        const prev$ = prevIndex === -1
          ? most.just(null)
          : this.dispatchByIndex$
              .select(prevIndex)
              // i don't want the changeset here, i want the sinks, and only if they've changed
              .startWith(event.list.getAt(prevIndex));
        
        const next$ = nextIndex >= event.list.size
          ? most.just(null)
          : this.dispatchByIndex$
              .select(nextIndex)
              // i don't want the changeset here, i want the sinks, and only if they've changed
              .startWith(event.list.getAt(nextIndex));

        return {prev$, next$};
      });
    
    const nextSibling$ = siblings$
      .map((({next$}) => next$))
      .switch()
  }
}

class ListItemMetadata
{
  constructor(key, index, count) {
    this._key = key;
    this._init = {index, count};
  }
}

function update(fn, defaultCollection = Collection()) {
  return stream$ => {
    const list$ = stream$
      .scan(fn, defaultCollection/*.setStream(() => switched$)*/)
      .skip(1)
      .thru(hold);

    const changes$ = list$
      .thru(switchCollection)
      .changes()
      .multicast();
    
    const dispatchByKey$ = changes$
      .thru(dispatch(selectKey));

    const dispatchByIndex$ = changes$
      .filter(hasIndex)
      .thru(dispatch(selectIndex));

    function prepareListItemMetadata(list, key, index) {
      
      const indexChanged$ = dispatchByKey$
        .select(key)
        .filter(hasDiffIndex)
        .multicast();

      const index$ = indexChanged$
        .map(selectDiffIndex)
        .startWith(index)
        .thru(hold);

      const count$ = list$
        .map(selectListCount)
        .skipRepeats()
        .startWith(list.size)
        .thru(hold);
      
      const previousSibling$ = indexChanged$
        .map(event => {
          
        });

        



    };

    return list$;
  };
}