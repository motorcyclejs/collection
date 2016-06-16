import assert from 'power-assert';
import Collection from '../src';

describe('Collection', () => {
  const list = Collection()
    .setInstance('a', {foo: 1})
    .setInstance('b', {bar: 2});

  describe('#get: (key: InstanceIdentifier)', () => {
    it('should return undefined if an item of the specified key does not exist', () => {
      const item = list.get('c');
      assert(item === void 0);
    });

    it('should return the collection item matching the specified key', () => {
      const itemB = list.get('b');
      assert(itemB !== void 0);
      assert(!('foo' in itemB));
      assert(itemB.sinks.bar === 2);

      const itemA = list.get('a');
      assert(itemA !== void 0);
      assert(!('bar' in itemA));
      assert(itemA.sinks.foo === 1);
    });
  });

  describe('#getAt: (index: Number)', () => {
    it('should return undefined if an item of the specified key does not exist', () => {
      const item = list.getAt(2);
      assert(item === void 0);
    });

    it('should return the collection item at the specified index', () => {
      const itemB = list.getAt(1);
      assert(itemB !== void 0);
      assert(!('foo' in itemB));
      assert(itemB.sinks.bar === 2);

      const itemA = list.getAt(0);
      assert(itemA !== void 0);
      assert(!('bar' in itemA));
      assert(itemA.sinks.foo === 1);
    });
  });

  describe('#has: (key: InstanceIdentifier)', () => {
    it('should return true if the specified key exists in the collection', () => {
      assert(list.has('b'));
    });

    it('should return false if the specified key is missing from the collection', () => {
      assert(!list.has('c'));
    });
  });
});