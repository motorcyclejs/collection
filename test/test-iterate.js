import assert from 'power-assert';
import Immutable from 'immutable';
import Collection from '../src';

describe('Collection', () => {
  describe('[Symbol.iterator]()', () => {
    it('should return an iterator', () => {
      const empty = Collection();
      assert(empty[Symbol.iterator]);
    });

    it('should iterate through the list of items in the collection', () => {
      const list = Collection()
        .setInstance(1, {sinks: {}})
        .setInstance(2, {sinks: {}});
      const it = list[Symbol.iterator]();
      const item0 = it.next();
      assert(!item0.done);
      assert(item0.value);
      assert(item0.value.key === 1);
      const item1 = it.next();
      assert(!item1.done);
      assert(item1.value);
      assert(item1.value.key === 2);
      assert(it.next().done);
    });
  });
});
