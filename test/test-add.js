import assert from 'power-assert';
import * as most from 'most';
import Collection from '../src';

describe('Collection', () => {
  function ComponentOne(sources) { return {fooSink: most.just(1), ...(sources||{})}; }
  function ComponentTwo(sources) { return {barSink: most.just(2), ...(sources||{})}; }
  const emptyList = Collection({
    types: [
      {key: 'typeOne', fn: ComponentOne},
      {key: 'typeTwo', fn: ComponentTwo}
    ]
  });

  function hasValue(value) {
    return value !== null && value !== void 0;
  }

  describe('#add: (...any)', () => {
    it('should assign a valid id value for the new item', () => {
      const list = emptyList.add();
      const id = list.state.get('items').keySeq().first();
      assert(hasValue(id));
    });

    it('should assign a unique id value for each new new item', () => {
      const list = emptyList.add().add().add();
      const ids = list.state.get('items').keySeq().toArray();
      const set = new Set(ids);
      assert(set.size === 3);
      assert(hasValue(ids[0]));
      assert(hasValue(ids[1]));
      assert(hasValue(ids[2]));
    });
  });

  describe('#add: ()', () => {
    it('should add a new instance of the default component type', () => {
      const list = emptyList.add();
      assert(list.state.get('items').size === 1);
      assert(list.state.get('items').valueSeq().first().type === 'typeOne');
    });
  });

  describe('#add: (input: Input)', () => {
    it('should add a new instance of the default component type', () => {
      const list = emptyList.add();
      assert(list.state.get('items').size === 1);
      assert(list.state.get('items').valueSeq().first().type === 'typeOne');
    });

    it('should use the specified input and instantiate the default component type', () => {
      const list = emptyList.add({x: most.empty()});
      assert(list.state.get('items').size === 1);
      const item = list.state.get('items').valueSeq().first();
      assert(item.type === 'typeOne');
      assert('x' in item.sinks);
    });
  });
  
  describe('#add: (type: TypeIdentifier, input: Input)', () => {
    it('should add a new instance of the specified component type', () => {
      const list = emptyList.add('typeTwo', {});
      assert(list.state.get('items').size === 1);
      assert(list.state.get('items').valueSeq().first().type === 'typeTwo');
    });

    it('should use the specified input and instantiate the specified component type', () => {
      const list = emptyList.add('typeTwo', {x: most.empty()});
      assert(list.state.get('items').size === 1);
      const item = list.state.get('items').valueSeq().first();
      assert(item.type === 'typeTwo');
      assert('x' in item.sinks);
    });
  });

  describe('#addInstance: (instance: Sinks)', () => {
    const list = emptyList.addInstance({test1: most.empty()});
    const items = list.state.get('items');

    it('should add a new item with the specified sinks', () => {
      assert(items.size === 1);
      assert('test1' in items.first().sinks);
    });

    it('should leave the component type undefined', () => {
      assert(items.first().type === void 0);
    });
  });

  describe('#addInstance: (type: TypeIdentifier, instance: Sinks)', () => {
    const list = emptyList.addInstance('typeTwo', {test1: most.empty()});
    const items = list.state.get('items');

    it('should add a new item with the specified sinks', () => {
      assert(items.size === 1);
      assert('test1' in items.first().sinks);
    });

    it('should assign the specified component type to the new item', () => {
      assert(items.first().type === 'typeTwo');
    });
  });
});
