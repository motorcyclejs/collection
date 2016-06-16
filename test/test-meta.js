import assert from 'power-assert';
import Collection from '../src';

describe('Collection', () => {
  const list = Collection()
    .setInstance('a', {foo: 1})
    .setInstance('b', {bar: 2});

  describe('#size: Number', () => {
    it('should return zero if the list is empty', () => {
      assert(Collection().size === 0);
    });

    it('should return the number of items in the collection', () => {
      assert(list.size === 2);
    });
  });
});