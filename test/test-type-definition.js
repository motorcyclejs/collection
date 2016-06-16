import assert from 'power-assert';
import Immutable from 'immutable';
import Collection from '../src';
import {componentTypeDefaults} from '../src/collection';

describe('TypeDefinition (defaults)', () => {
  describe('#instantiate()', () => {
    it('should call the component function and return its result by default', () => {
      const type = Object.assign({}, componentTypeDefaults, {fn() { return 'x'; }});
      assert(type.instantiate(null, type, Collection()) === 'x');
    });

    it('should merge sources from input -> type -> list', () => {
      const inputSources = {a: 1, x: 10};
      const typeSources = {b: 2, x: 11, y: 20};
      const listSources = {c: 3, y: 12};
      const expectedSources = Object.assign({}, listSources, typeSources, inputSources);
      const type = Object.assign({}, componentTypeDefaults, {
        sources: typeSources,
        fn(sources) { return sources; }
      });
      const list = Collection({sources: listSources});
      assert.deepEqual(type.instantiate(inputSources, type, list), expectedSources);
    });

    it('should have its result assigned to the item\'s `sinks` property', () => {
      const type = Object.assign({}, componentTypeDefaults, {fn() { return 'x'; }});
      const list = Collection().define(type).add('x');
      const item = list.state.get('items', Immutable.Map()).first();
      assert.strictEqual(item.sinks, 'x');
    });
  });
});
