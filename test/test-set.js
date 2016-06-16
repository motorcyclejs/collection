import assert from 'power-assert';
import most from 'most';
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

  describe('#set(key: InstanceIdentifier, input: Input)', () => {
    it('should add a new item if the specified key does not exist yet', () => {
      const list = emptyList.set('firstItem', {}).set('secondItem', {});
      assert(list.state.hasIn(['items', 'firstItem']));
      assert(list.state.hasIn(['items', 'secondItem']));
      const firstItem = list.state.getIn(['items', 'firstItem'], {sinks:{}});
      const secondItem = list.state.getIn(['items', 'secondItem'], {sinks:{}});
      assert('fooSink' in firstItem.sinks);
      assert('fooSink' in secondItem.sinks);
    });

    it('should replace the existing item if the specified key already exists', () => {
      const list1 = emptyList.set('firstItem', {}).set('secondItem', {});
      assert(!('next' in list1.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks));
      
      const list2 = list1.set('firstItem', {next: most.empty()});
      assert(list2.state.get('items').size === 2);
      assert('next' in list2.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks);
    });

    it('should use the default type when setting the item', () => {
      const list = emptyList.set('firstItem', {});
      assert(list.state.getIn(['items', 'firstItem'], {}).type === 'typeOne');
    });
  });

  describe('#set(key: InstanceIdentifier, type: TypeIdentifier, input: Input)', () => {
    it('should add a new item of the correct type if the specified key does not exist yet', () => {
      const list = emptyList.set('firstItem', 'typeTwo', {}).set('secondItem', 'typeOne', {});
      assert(list.state.hasIn(['items', 'firstItem']));
      assert(list.state.hasIn(['items', 'secondItem']));
      assert('barSink' in list.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks);
      assert('fooSink' in list.state.getIn(['items', 'secondItem'], {sinks:{}}).sinks);
    });

    it('should replace the existing item with a new firstItem of the correct type if the specified key already exists', () => {
      const list1 = emptyList.set('firstItem', 'typeTwo', {}).set('secondItem', 'typeOne', {});
      const item1 = list1.state.getIn(['items', 'firstItem'], {sinks:{}});
      assert(!('next' in item1.sinks));
      assert('barSink' in item1.sinks);
      
      const list2 = list1.set('firstItem', 'typeTwo', {next: most.empty()});
      assert(list2.state.get('items').size === 2);
      const item2 = list2.state.getIn(['items', 'firstItem'], {sinks:{}});
      assert('next' in item2.sinks);
      assert('barSink' in item2.sinks);
    });
  });

  describe('#setAt(index: Number, input: Input)', () => {
    it('should throw an error if the index is not already occupied by an existing item', () => {
      assert.throws(() => emptyList.setAt(0, {}));
    });

    it('should replace the item at the specified index with a new item of the default type', () => {
      const list1 = emptyList.add('typeOne', null).add('typeTwo', null);
      const list2 = list1.setAt(1, null);
      const items1 = list1.state.get('items');
      const items2 = list2.state.get('items');
      const values1 = items1.valueSeq().toArray();
      const values2 = items2.valueSeq().toArray();
      assert(items1.size === 2);
      assert(values1[0].type === 'typeOne');
      assert(values1[1].type === 'typeTwo');
      assert(items2.size === 2);
      assert(values2[0].type === 'typeOne');
      assert(values2[1].type === 'typeOne');
    });
  });

  describe('#setAt(index: Number, type: TypeIdentifier, input: Input)', () => {
    it('should throw an error if the index is not already occupied by an existing item', () => {
      assert.throws(() => emptyList.setAt(0, 'typeTwo', {}));
    });

    it('should replace the item at the specified index with a new item of the specified type', () => {
      const list1 = emptyList.add('typeOne', null).add('typeOne', null);
      const list2 = list1.setAt(1, 'typeTwo', null);
      const items1 = list1.state.get('items');
      const items2 = list2.state.get('items');
      const values1 = items1.valueSeq().toArray();
      const values2 = items2.valueSeq().toArray();
      assert(items1.size === 2);
      assert(values1[0].type === 'typeOne');
      assert(values1[1].type === 'typeOne');
      assert(items2.size === 2);
      assert(values2[0].type === 'typeOne');
      assert(values2[1].type === 'typeTwo');
    });
  });

  describe('#setInstance(key: InstanceIdentifier, instance: Sinks)', () => {
    it('should add the instance as a new item if the specified key does not exist yet', () => {
      const list = emptyList.setInstance('firstItem', {test1: most.empty()});
      assert(list.state.hasIn(['items', 'firstItem']));
      assert('test1' in list.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks);
    });

    it('should replace the instance if the specified key already exists', () => {
      const list1 = emptyList.setInstance('firstItem', {test1: most.empty()});
      assert(list1.state.hasIn(['items', 'firstItem']));
      assert('test1' in list1.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks);

      const list2 = emptyList.setInstance('firstItem', {test2: most.empty()});
      assert(list2.state.hasIn(['items', 'firstItem']));
      assert('test2' in list2.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks);
    });

    it('should set the item as being of an undefined component type', () => {
      const list = emptyList.setInstance('firstItem', {test1: most.empty()});
      assert(list.state.hasIn(['items', 'firstItem']));
      assert(list.state.getIn(['items', 'firstItem'], {}).type === void 0);
    });
  });

  describe('#setInstance(key: InstanceIdentifier, type: TypeIdentifier, instance: Sinks)', () => {
    it('should add the instance as a new item if the specified key does not exist yet', () => {
      const list = emptyList.setInstance('firstItem', 'typeTwo', {test1: most.empty()});
      assert(list.state.hasIn(['items', 'firstItem']));
      assert('test1' in list.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks);
    });

    it('should replace the instance if the specified key already exists', () => {
      const list1 = emptyList.setInstance('firstItem', 'typeTwo', {test1: most.empty()});
      assert(list1.state.hasIn(['items', 'firstItem']));
      assert('test1' in list1.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks);

      const list2 = emptyList.setInstance('firstItem', 'typeTwo', {test2: most.empty()});
      assert(list2.state.hasIn(['items', 'firstItem']));
      assert('test2' in list2.state.getIn(['items', 'firstItem'], {sinks:{}}).sinks);
    });

    it('should set the item as being of the specified component type', () => {
      const list = emptyList.setInstance('firstItem', 'typeTwo', {test1: most.empty()});
      assert(list.state.hasIn(['items', 'firstItem']));
      assert(list.state.getIn(['items', 'firstItem'], {}).type === 'typeTwo');
    });
  });

  describe('#setInstanceAt(index: Number, instance: Sinks)', () => {
    it('should throw an error if the index is not already occupied by an existing item', () => {
      assert.throws(() => emptyList.setInstanceAt(0, {}));
    });

    it('should replace the item at the specified index with a new item of undefined type', () => {
      const list1 = emptyList.add('typeOne', null).add('typeTwo', null);
      const list2 = list1.setInstanceAt(1, {});
      const items1 = list1.state.get('items');
      const items2 = list2.state.get('items');
      const values1 = items1.valueSeq().toArray();
      const values2 = items2.valueSeq().toArray();
      assert(items1.size === 2);
      assert(values1[0].type === 'typeOne');
      assert(values1[1].type === 'typeTwo');
      assert(items2.size === 2);
      assert(values2[0].type === 'typeOne');
      assert(values2[1].type === void 0);
    });
  });

  describe('#setInstanceAt(index: Number, type: TypeIdentifier, instance: Sinks)', () => {
    it('should throw an error if the index is not already occupied by an existing item', () => {
      assert.throws(() => emptyList.setInstanceAt(0, 'typeTwo', {}));
    });

    it('should replace the item at the specified index with a new item of the specified type', () => {
      const list1 = emptyList.add('typeOne', null).add('typeOne', null);
      const list2 = list1.setInstanceAt(1, 'typeTwo', {});
      const items1 = list1.state.get('items');
      const items2 = list2.state.get('items');
      const values1 = items1.valueSeq().toArray();
      const values2 = items2.valueSeq().toArray();
      assert(items1.size === 2);
      assert(values1[0].type === 'typeOne');
      assert(values1[1].type === 'typeOne');
      assert(items2.size === 2);
      assert(values2[0].type === 'typeOne');
      assert(values2[1].type === 'typeTwo');
    });
  });
});
