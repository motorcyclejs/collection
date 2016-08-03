import {Collection as ICollection} from './collection';
import {merge, combineArray, combineObject, combineImmutable, switchNext,
        isCollection, areCollectionsEqual, areCollectionItemsEqual} from './statics';

export default function Collection() {
  return new ICollection(...arguments);
};

Collection.merge = merge;
Collection.combineArray = combineArray;
Collection.combineObject = combineObject;
Collection.combineImmutable = combineImmutable;
Collection.isCollection = isCollection;
Collection.isEqual = areCollectionsEqual;
Collection.areItemsEqual = areCollectionItemsEqual;
Collection.switch = switchNext;