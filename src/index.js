import {Collection as ICollection} from './collection';
import {merge, combineArray, combineObject, isCollection, areCollectionsEqual, areCollectionItemsEqual} from './statics';

export default function Collection() {
  return new ICollection(...arguments);
};

Collection.merge = merge;
Collection.combineArray = combineArray;
Collection.combineObject = combineObject;
Collection.isCollection = isCollection;
Collection.isEqual = areCollectionsEqual;
Collection.areItemsEqual = areCollectionItemsEqual;
