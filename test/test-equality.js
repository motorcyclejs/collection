import assert from 'power-assert';
import Collection from '../src';

describe('Collection', () => {
  describe('.isEqual', () => {
    it('should return true if the two collections are the same', () => {
      const sinks = {};
      const list1 = Collection().setInstance('foo', sinks);
      const list2 = list1.remove('nonexistent');
      assert.deepEqual(list1, list2);
      assert(Collection.isEqual(list1, list2));
    });

    it('should return false if the two collections have a different set of items', () => {
      const sinks1 = {}, sinks2 = {};
      const list1 = Collection().setInstance('foo', sinks1);
      const list2 = list1.setInstance('bar', sinks2);
      assert(!Collection.isEqual(list1, list2));
    });

    it('should return false if the two collections have different component definitions', () => {
      const sinks = {};
      const list1 = Collection().setInstance('foo', sinks);
      const list2 = list1.define({fn: ()=>{}});
      assert(!Collection.isEqual(list1, list2));
    });
  });

  describe('.areItemsEqual', () => {
    it('should return true if the two collections are the same', () => {
      const sinks = {};
      const list1 = Collection().setInstance('foo', sinks);
      const list2 = list1.remove('nonexistent');
      assert(Collection.areItemsEqual(list1, list2));
    });

    it('should return false if the two collections have a different set of items', () => {
      const sinks1 = {}, sinks2 = {};
      const list1 = Collection().setInstance('foo', sinks1);
      const list2 = list1.setInstance('bar', sinks2);
      assert(!Collection.areItemsEqual(list1, list2));
    });

    it('should return true if the two collections differ only in their component definitions', () => {
      const sinks = {};
      const list1 = Collection().setInstance('foo', sinks);
      const list2 = list1.define({fn: ()=>{}});
      assert(Collection.areItemsEqual(list1, list2));
    });
  });
});
