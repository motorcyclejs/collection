import assert from 'power-assert';
import Collection from '../src';

describe('Collection', () => {
  describe('.isCollection(arg: any)', () => {
    it('should return true if the argument is a collection', () => {
      const list = Collection();
      assert(Collection.isCollection(list));
      assert(Collection.isCollection(list.clear()));
    });
    
    it('should return false if the argument is falsey', () => {
      assert(!Collection.isCollection(void 0));
      assert(!Collection.isCollection(null));
      assert(!Collection.isCollection(0));
      assert(!Collection.isCollection(''));
      assert(!Collection.isCollection(false));
    });

    it('should return false if the argument is truthy but is not an object', () => {
      assert(!Collection.isCollection(1));
      assert(!Collection.isCollection('test'));
      assert(!Collection.isCollection(true));
    });

    it('should return false if the argument is an object but not a collection', () => {
      assert(!Collection.isCollection({}));
      assert(!Collection.isCollection(new Date()));
    });
  });
});