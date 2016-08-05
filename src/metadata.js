import most from 'most';
import hold from '@most/hold';
import dispatch from 'most-dispatch';

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

function getItem(index) {
  return event => {
    if(!event || index >= event.list.size) {
      return null;
    }
    const item = event.list.getAt(index);
    return {key: item.key, sinks: item.sinks};
  };
}

export class MetadataBuilder
{
  constructor(collection$, switched$) {
    this._total$ = collection$
      .map(selectListCount)
      .skipRepeats()
      .thru(hold); 

    const change$ = switched$
      .changes()
      .multicast();

    this._dispatchByKey$ = change$
      .thru(dispatch(selectKey));
    
    this._dispatchByIndex$ = change$
      .filter(hasIndex)
      .thru(dispatch(selectIndex));
  }

  create(key, index) {
    const indexChanged$ = this._dispatchByKey$
      .select(key)
      .filter(hasDiffIndex)
      .multicast();

    const index$ = indexChanged$
      .map(selectDiffIndex)
      .startWith(index)
      .thru(hold);

    const skip = Symbol('skip');

    const siblings$ = indexChanged$
      .map(event => {
        const index = event.diff.index;
        const prevIndex = index - 1;
        const nextIndex = index + 1;
        
        const prev$ = index === 0
          ? most.just(null)
          : this._dispatchByIndex$
              .select(prevIndex)
              .filter(event => event.type !== 'removed')
              .startWith(event)
              .map(getItem(prevIndex))
              .startWith(event.list.getAt(prevIndex).sinks);
        
        const next$ = this._dispatchByIndex$
          .select(nextIndex)
          .map(event => event.type === 'removed'
            ? event.list.size >= nextIndex ? null : skip
            : event)
          .filter(arg => arg !== skip)
          .startWith(event)
          .map(getItem(nextIndex));

        return {prev$, next$};
      });
    
    const previousSibling$ = siblings$
      .map(({prev$}) => prev$)
      .switch();
    
    const nextSibling$ = siblings$
      .map(({next$}) => next$)
      .switch();

    const total$ = this._total$;

    return {index$, previousSibling$, nextSibling$, total$};
  }
}
