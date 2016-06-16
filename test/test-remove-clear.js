import assert from 'power-assert';
import Collection from '../src';

describe('Collection', () => {
  const list = Collection()
    .setInstance('a', {foo: 1})
    .setInstance('b', {bar: 2})
    .setInstance('c', {xyz: 3});

  describe('#remove: (key: InstanceIdentifier)', () => {
    it('should remove the item having the specified key', () => {
      const nextList = list.remove('b');
      assert(nextList.has('a'));
      assert(!nextList.has('b'));
      assert(nextList.has('c'));
      assert(nextList.state.get('items').size === 2);
    });

    it('should do nothing if there is not item with the specified key', () => {
      const nextList = list.remove('d');
      assert(nextList.has('a'));
      assert(nextList.has('b'));
      assert(nextList.has('c'));
      assert(nextList.state.get('items').size === 3);
    });
  });

  describe('#removeAt: (index: Number)', () => {
    it('should remove the item at the specified index', () => {
      const nextList = list.removeAt(1);
      assert(nextList.has('a'));
      assert(!nextList.has('b'));
      assert(nextList.has('c'));
      assert(nextList.state.get('items').size === 2);
    });

    it('should do nothing if the specified index does not contain an item', () => {
      const nextList = list.removeAt(3);
      assert(nextList.has('a'));
      assert(nextList.has('b'));
      assert(nextList.has('c'));
      assert(nextList.state.get('items').size === 3);
    });
  });

  describe('#clear()', () => {
    it('should remove all items in the collection', () => {
      assert(list.clear().state.get('items').size === 0);
    });
  });
});