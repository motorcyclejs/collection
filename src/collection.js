import most from 'most';
import hold from '@most/hold';
import Immutable from 'immutable';
import {combineArray, combineObject} from './statics';
import Snapshot from './snapshot';

const nextListId = (() => {
  let _id = 0;
  return () => `list-item-${++_id}`;
})();

function hasValue(value) {
  return value;
}

const emptyMap = Immutable.Map();
const emptyOrderedMap = Immutable.OrderedMap();
const defaultCollectionState = Immutable.Map({
  sources: {},
  types: emptyOrderedMap,
  items: emptyOrderedMap
});

export const componentTypeDefaults = {
  fn() { throw new Error('Component function not defined'); },
  instantiate(input, type, list) {
    const sources = Object.assign({},
      list.state.get('sources') || {},
      type.sources || {},
      input && typeof input === 'object' ? input : {});
    return this.fn(sources);
  }
};

function defineComponent() {
  const arg0 = arguments[0];
  let key, type;
  if(typeof arg0 === 'string') {
    key = arg0;
    type = arguments[1];
  }
  else {
    type = arg0;
  }
  if(typeof type === 'function') {
    type = {fn: type};
  }
  else if(!type || typeof type !== 'object') {
    throw new Error('A component function or options argument must be specified as argument 0 or 1');
  }
  if(key === void 0) {
    if('key' in type) {
      key = type.key;
    }
    else if('fn' in type) {
      key = type.fn.name;
    }
    if(key === void 0 || key === '') {
      key = '_default';
    }
  }
  return [key, Object.assign({key}, componentTypeDefaults, type)];
}

function defineTypesFromArray(state, types) {
  return types.reduce((state, def) => {
    const [key, type] = defineComponent(def);
    return state.setIn(['types', key], type);
  }, state);
}

function defineTypesFromKeyMap(state, types) {
  return Object.keys(types).reduce((state, key) => {
    const def = types[key];
    const [typeKey, type] = defineComponent(key, def);
    return state.setIn(['types', typeKey], type);
  }, state);
}

function defineTypes(state, types) {
  if(!types) {
    return state;
  }
  if(typeof types !== 'object') {
    throw new Error('Collection options.types must be an array of types or an object of key:type pairs');
  }
  return Array.isArray(types)
    ? defineTypesFromArray(state, types)
    : defineTypesFromKeyMap(state, types);
}

function defineSources(state, sources) {
  if(!sources) {
    return state;
  }
  if(typeof sources !== 'object') {
    throw new Error('Collection options.sources must be an object of key:value pairs');
  }
  return state.set('sources', Object.assign({}, sources));
}

function orderBySinkValue(sinkKey) {
  return (a, b) => 0;
}

function orderBySinkValues(sinkKeys) {
  return (a, b) => 0;
}

function defineSorting(state, orderBy) {
  if(!orderBy) {
    return state.delete('orderBy');
  }
  let fn;
  if(typeof orderBy === 'string') {
    fn = orderBySinkValue(orderBy);
  }
  else if(typeof orderBy === 'function') {
    fn = orderBy;
  }
  else if(Array.isArray(orderBy)) {
    fn = orderBySinkValues(orderBy);
  }
  else {
    throw new Error('Collection options.orderBy must be a sink key, an array of sink keys, or a sort function');
  }
  return state.set('orderBy', fn);
}

function defineSnapshotConfig(state, snapshot) {
  if(!snapshot) {
    return state;
  }
  let sinkKeys;
  if(snapshot === true) {
    sinkKeys = void 0;
  }
  else if(typeof snapshot === 'string') {
    sinkKeys = [snapshot];
  }
  else if(Array.isArray(snapshot)) {
    sinkKeys = snapshot.length > 0 ? snapshot : void 0;
  }
  else {
    throw new Error('Collection options.snapshot must be a sink key or an array of sink keys');
  }

  return state.set('snapshot', Snapshot.create(sinkKeys).state);
}

function isComponentDefinition(arg) {
  return typeof arg === 'function'
    || (arg
      && typeof arg === 'object'
      && (
        typeof arg.fn === 'function' ||
        typeof arg.instantiate === 'function'
      ));
}

function applyCollectionOptions(state, options) {
  if(!options) {
    return state;
  }
  if(isComponentDefinition(options)) {
    options = {types: [options]};
  }
  else if(typeof options !== 'object') {
    throw new Error('Collection options must be an object or a component function');
  }
  const withTypes = defineTypes(state, options.types);
  const withSources = defineSources(withTypes, options.sources);
  const withValues = defineSnapshotConfig(withSources, options.snapshot); 
  const withSorting = defineSorting(withValues, options.orderBy);
  
  return withSorting;
}

function applyDefaultComponentType(state, ...args) {
  const [typeKey, type] = defineComponent(...args);
  return state.setIn(['types', typeKey], type);
}

export class Collection
{
  constructor() {
    const arg0 = arguments[0];
    this.state = Immutable.Map.isMap(arg0)
      ? arg0
      : arguments.length === 1
        ? applyCollectionOptions(defaultCollectionState, arg0)
        : arguments.length === 2 || typeof arg0 === 'function'
          ? applyDefaultComponentType(defaultCollectionState, ...arguments)
          : defaultCollectionState;
  }

  _getType(typeKey, allowThrow) {
    const type = this.state.getIn(['types', typeKey]);
    if(allowThrow && !type) {
      throw new Error('Cannot set collection item; specified component type has not been defined');
    }
    return type;
  }

  _runComponent(input, typeKey) {
    const type = this._getType(typeKey, true);
    const sinks = type.instantiate(input, type, this);
    return sinks;
  }

  _createItem(key, type, input, sinks) {
    if(key === void 0 || key === null) {
      throw new Error('Cannot set list item; no key was specified');
    }
    if(!sinks) {
      sinks = sinks || this._runComponent(input, type);
    }
    return {key, type, sinks, input};
  }

  _setItem(key, item) {
    const nextState = this.state.setIn(['items', key], item);
    return new Collection(nextState);
  }

  _getDefaultTypeKey() {
    return this.state.get('types', emptyOrderedMap).keySeq().first();
  }

  _sort(state, force) {
    const orderBy = this.state.get('orderBy');
    if(!orderBy) {
      return state;
    }
    if(!force && state.get('pending', emptyMap).size) {
      return state;
    }
    
    if(state.has('snapshot')) {
      const values = state.getIn(['snapshot', 'values'], emptyMap);
      return state.update('items', items => {
        return items.sortBy((v, key) => [key, values.get(key, emptyMap)], orderBy);
      });
    }
    
    return state.update('items', items => items.sort(orderBy));
  }

  get size() {
    return this.state.get('items').size;
  }

  get isDataPending() {
    return this.state.get('pending').size > 0;
  }

  get snapshot() {
    const state = this.get('snapshot');
    return state ? new Snapshot(state) : Snapshot.create();
  }

  define() {
    const [typeKey, type] = defineComponent(...arguments);
    const nextState = this.state.setIn(['types', typeKey], type);
    return new Collection(nextState);
  }

  orderBy(comparator, forceSortNow) {
    const state = this._sort(defineSorting(this.state, comparator), forceSortNow);
    return new Collection(state);
  }

  add() {
    return this.set(nextListId(), ...arguments);
  }

  addInstance(type, instance) {
    return this.setInstance(nextListId(), ...arguments);
  }

  set(key, type, input) {
    if(arguments.length <= 2) {
      input = type;
      type = this._getDefaultTypeKey();
    }
    const item = this._createItem(key, type, input);
    return this._setItem(key, item);
  }

  setAt(index, type, input) {
    if(arguments.length <= 2) {
      input = type;
      type = this._getDefaultTypeKey();
    }
    const key = this.state.get('items').keySeq().get(index);
    if(key === void 0) {
      throw new Error(`Cannot set item at index ${index}; no item exists at that index`);
    }
    const item = this._createItem(key, type, input);
    return this._setItem(key, item);
  }

  setInstance(key, type, sinks) {
    if(arguments.length === 2) {
      sinks = type;
      type = void 0;
    }
    const item = this._createItem(key, type, void 0, sinks);
    return this._setItem(key, item);
  }

  setInstanceAt(index, type, sinks) {
    if(arguments.length === 2) {
      sinks = type;
      type = void 0;
    }
    const key = this.state.get('items').keySeq().get(index);
    if(key === void 0) {
      throw new Error(`Cannot set item at index ${index}; no item exists at that index`);
    }
    const item = this._createItem(key, type, void 0, sinks);
    return this._setItem(key, item);
  }

  get(key) {
    return this.state.getIn(['items', key]);
  }

  getAt(index) {
    return this.state.get('items').valueSeq().get(index);
  }

  has(key) {
    return this.state.hasIn(['items', key]);
  }

  remove(key) {
    const state = this.state.deleteIn(['items', key]);
    return new Collection(state);
  }

  removeAt(index) {
    const key = this.state.get('items').keySeq().get(index);
    const state = this.state.deleteIn(['items', key]);
    return new Collection(state);
  }

  clear() {
    const state = this.state.set('items', emptyOrderedMap);
    return new Collection(state);
  }

  updateSnapshot(snapshot) {
    const state = this._sort(this.state.set('snapshot', snapshot.state));
    return new Collection(state);
  }

  merge(keysArg) {
    if(Array.isArray(keysArg)) {
      return keysArg.reduce((sinks, key) => ((sinks[key] = this.merge(key)), sinks), {});
    }
    const items = this.state.get('items');
    const streams = items.valueSeq()
      .map(item => item.sinks[keysArg])
      .filter(hasValue)
      .toArray();
    return most.mergeArray(streams);
  }

  combineArray() {
    return combineArray(...arguments, most.just(this));
  }

  combineObject() {
    return combineObject(...arguments, most.just(this));
  }

  keys() {
    const items = this.state.get('items');
    return items.keys();
  }

  entries() {
    const items = this.state.get('items');
    return items.entries();
  }

  [Symbol.iterator]() {
    const items = this.state.get('items');
    return items.values();
  }
}
