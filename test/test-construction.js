import assert from 'power-assert';
import Immutable from 'immutable';
import Collection from '../src';

describe('Collection', () => {
  describe('()', () => {
    it('should return an empty collection', () => {
      const empty = Collection();
      assert(empty.constructor.name === 'Collection');
    });

    it('should assign a default empty state as its initial state', () => {
      const empty = Collection();
      assert(Immutable.Map.isMap(empty.state));
      assert(empty.state.has('types'));
      assert(empty.state.get('types').size === 0);
      assert(empty.state.has('items'));
      assert(empty.state.get('items').size === 0);
    });
  });

  describe('(fn: Component)', () => {
    it('should be the same as calling collection.define(fn)', () => {
      function Test() {}
      const list1 = Collection(Test);
      const list2 = Collection().define(Test);
      assert(list1.state.hasIn(['types', Test.name]));
      assert.deepEqual(list1, list2);
    });
  });

  describe('(type: TypeIdentifier, fn: Component)', () => {
    it('should be the same as calling collection.define(type, fn)', () => {
      function Test() {}
      const typeId = 'foo';
      const list1 = Collection(typeId, Test);
      const list2 = Collection().define(typeId, Test);
      assert(list1.state.hasIn(['types', 'foo']));
      assert.deepEqual(list1, list2);
    });
  });

  describe('(options: ComponentDefinition)', () => {
    it('should be the same as calling collection.define(options)', () => {
      function Test() {}
      const options = {key: 'foo', fn: Test};
      const list1 = Collection(options);
      const list2 = Collection().define(options);
      assert(list1.state.hasIn(['types', 'foo']));
      assert.deepEqual(list1, list2);
    });
  });

  describe('(options: ListOptions)', () => {
    describe('where options.sources is defined', () => {
      it('should be ignored if null', () => {
        const options = {sources: null};
        const list = Collection(options);
        assert.deepEqual(list.state.get('sources'), {});
      });

      it('should throw an error if not an object', () => {
        const options = {sources: 'invalid'};
        assert.throws(() => Collection(options));
      });

      it('should be assigned to collection.state->sources', () => {
        const options = {sources: {foo:1}};
        const list = Collection(options);
        assert.deepEqual(list.state.get('sources'), options.sources);
      });

      it('should be cloned, not referenced', () => {
        const options = {sources: {foo:1}};
        const list = Collection(options);
        assert.notStrictEqual(list.state.get('sources'), options.sources);
      });
    });

    describe('where options.types is defined', () => {
      it('should be ignored if null', () => {
        const options = {types: null};
        const list = Collection(options);
        assert(list.state.get('types').size === 0);
      });

      it('should throw an error if not an object or an array', () => {
        const options = {types: 'invalid'};
        assert.throws(() => Collection(options));
      });

      it('should have the same result as calling #define(key, value) when options.types is a plain object', () => {
        const type1 = {fn: function Test1() {}};
        const type2 = function Test2() {};
        const options = {types: {foo: type1, bar: type2}};
        const list1 = Collection(options);
        const list2 = Collection().define('foo', type1).define('bar', type2);
        assert.deepEqual(list1, list2);
      });

      it('should have the same result as calling #define(type) when options.types is an array', () => {
        const type1 = {key: 'foo', fn: function Test1() {}};
        const type2 = function Test2() {};
        const options = {types: [type1, type2]};
        const list1 = Collection(options);
        const list2 = Collection().define(type1).define(type2);
        assert.deepEqual(list1, list2);
      });
    });
  });
});
