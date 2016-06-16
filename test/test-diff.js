import assert from 'power-assert';
import most from 'most';
import Collection from '../src';
import {calculateDiff, compareItems, compareSinks} from '../src/diff';
import {isStream} from './helpers';

describe('(Diff)', () => {
  describe('compareSinks(keys, last, next)', () => {
    it('should return null if both arguments are identical', () => {
      const last = {a: most.empty(), b: most.just(1)};
      const next = {a: last.a, b: last.b};
      assert(compareSinks(null, last, next) === null);
    });

    describe('when the arguments have differences', () => {
      const last = {a: most.empty(), b: most.just(1), c: most.just('c')};
      const next = {a: last.a, b: most.just(2), d: most.just('d')};
      function run() {
        return compareSinks(null, last, next);
      }

      it('should return an array of tuples', () => {
        const result = run();
        assert(Array.isArray(result));
        assert(result.every(t => Array.isArray(t) && t.length === 2));
      });

      it('should specify the sink key for the first value in each tuple', () => {
        const result = run();
        assert(result.length === 3);
        assert(result.findIndex(t => t[0] === 'b') !== -1);
        assert(result.findIndex(t => t[0] === 'c') !== -1);
        assert(result.findIndex(t => t[0] === 'd') !== -1);
      });

      it('should specify null for the second value in any tuple where the sink was removed', () => {
        const result = run();
        assert(result.find(t => t[0] === 'c')[1] === null);
      });

      it('should specify a stream reference for the second value in any tuple if the sink was added or changed', () => {
        const result = run();
        assert(result.find(t => t[0] === 'b')[1] === next.b);
        assert(result.find(t => t[0] === 'd')[1] === next.d);
      });
    });
  });

  describe('compareItems(keys, last, next)', () => {
    describe('when the items are identical', () => {
      it('should return null', () => {
        const last = {index: 7, sinks: {a: most.empty(), b: most.just(1)}};
        const next = {index: 7, sinks: {a: last.sinks.a, b: last.sinks.b}};
        assert(compareItems(null, last, next) === null);
      });
    });

    describe('when only the item index differs', () => {
      function run() {
        const last = {index: 7, sinks: {a: most.empty(), b: most.just(1)}};
        const next = {index: 8, sinks: {a: last.sinks.a, b: last.sinks.b}};
        return compareItems(null, last, next);
      }

      it('should include the new index', () => {
        assert.deepEqual(run(), {index: 8});
      });

      it('should exclude the sinks comparison', () => {
        assert(!('sinks' in run()));
      });
    });

    describe('when only the set of sinks differs', () => {
      const last = {index: 7, sinks: {a: most.empty(), b: most.just(1)}};
      const next = {index: 7, sinks: {a: last.sinks.a, b: most.just(2)}};
      function run() {
        return compareItems(null, last, next);
      }

      it('should exclude the new index', () => {
        assert(!('index' in run()));
      });

      it('should include the sinks comparison', () => {
        assert.deepEqual(run(), {sinks: [['b', next.sinks.b]]});
      });
    });

    describe('when both the index and the set of sinks differs', () => {
      const last = {index: 7, sinks: {a: most.empty(), b: most.just(1)}};
      const next = {index: 8, sinks: {a: last.sinks.a, b: most.just(2)}};
      function run() {
        return compareItems(null, last, next);
      }

      it('should include the new index', () => {
        assert(run().index === 8);
      });

      it('should include the sinks comparison', () => {
        assert.deepEqual(run().sinks, [['b', next.sinks.b]]);
      });
    });
  });

  describe('calculateDiff(keys, a, b)', () => {
    it('should return null if the list items have not changed', () => {
      const diff = calculateDiff(null, Collection(), Collection());
      assert(diff === null);
    });

    it('should return an object containing the properties `added`, `removed` and `changed` if the list items differ at all', () => {
      const diff = calculateDiff(null, Collection(), Collection().addInstance({a: most.empty()}));
      assert('added' in diff);
      assert('removed' in diff);
      assert('changed' in diff);
    });

    describe('#removed', () => {
      it('should be a native Map object', () => {
        const {removed} = calculateDiff(null, Collection(), Collection().addInstance({a: most.empty()}));
        assert(removed instanceof Map);
      });

      it('should be empty if no items were removed from the list', () => {
        const list1 = Collection().addInstance({a: most.empty()});
        const list2 = list1.addInstance({b: most.empty()});
        const {removed} = calculateDiff(null, list1, list2);
        assert(removed.size === 0);
      });

      it('should list only items that are unique in the first list', () => {
        const list1 = Collection()
          .setInstance('a', {x: most.empty()})
          .setInstance('b', {x: most.empty()});
        const list2 = list1.remove('a');
        const {removed} = calculateDiff(null, list1, list2);
        assert(removed.size === 1);
        assert(removed.has('a'));
      });
    });

    describe('#added', () => {
      it('should be a native Map object', () => {
        const {added} = calculateDiff(null, Collection(), Collection().addInstance({a: most.empty()}));
        assert(added instanceof Map);
      });

      it('should be empty if no items were added to the list', () => {
        const list1 = Collection()
          .setInstance('a', {x: most.empty()})
          .setInstance('b', {x: most.empty()});
        const list2 = list1.remove('a');
        const {added} = calculateDiff(null, list1, list2);
        assert(added.size === 0);
      });

      it('should list only items that are unique in the second list', () => {
        const list1 = Collection()
          .setInstance('a', {x: most.empty()})
          .setInstance('b', {x: most.empty()});
        const list2 = list1.setInstance('c', {x: most.empty()});
        const {added} = calculateDiff(null, list1, list2);
        assert(added.size === 1);
        assert(added.has('c'));
      });

      it('should include only the whitelisted sink keys', () => {
        const list1 = Collection();
        const list2 = list1
          .setInstance('a', {x: most.empty()})
          .setInstance('b', {x: most.empty(), y: most.just(1)});
        const {added} = calculateDiff(['x'], list1, list2);
        assert(added.size === 2);
        assert(added.has('a'));
        assert(added.has('b'));
        assert('x' in added.get('a').sinks);
        assert(!('y' in added.get('a').sinks));
      });

      it('should include the index of the list item in each value', () => {
        const list1 = Collection()
          .setInstance('a', {x: most.empty()})
          .setInstance('b', {x: most.empty()});
        const list2 = list1.setInstance('c', {x: most.empty()});
        const {added} = calculateDiff(null, list1, list2);
        assert(added.get('c').index === 2);
      });

      it('should include the sinks object from the collection item in each value', () => {
        const list1 = Collection()
          .setInstance('a', {x: most.empty()});
        const list2 = list1
          .setInstance('b', {y: most.empty()})
          .setInstance('c', {z: most.empty()});
        const {added} = calculateDiff(null, list1, list2);
        assert(added.get('b').sinks.y);
        assert(added.get('c').sinks.z);
      });
    });

    describe('#changed', () => {
      it('should be a native Map object', () => {
        const {changed} = calculateDiff(null, Collection(), Collection().addInstance({a: most.empty()}));
        assert(changed instanceof Map);
      });

      it('should be empty if no items were changed in the list', () => {
        const list1 = Collection().addInstance({a: most.empty()});
        const list2 = list1.addInstance({b: most.empty()});
        const {changed} = calculateDiff(null, list1, list2);
        assert(changed.size === 0);
      });

      it('should list only items that are common to both lists', () => {
        const list1 = Collection()
          .setInstance('a', {x: most.empty()})
          .setInstance('b', {x: most.empty()})
          .setInstance('c', {y: most.empty()});
        const list2 = list1
          .setInstance('c', {z: most.just(1)})
          .setInstance('d', {z: most.empty()})
          .remove('a', {p: most.empty()});
        const {changed} = calculateDiff(null, list1, list2);
        assert(changed.size === 2);
        assert(changed.has('b'));
        assert(changed.has('c'));
      });

      it('should include the index if the item index changed in the list', () => {
        const k = most.just(2);
        const list1 = Collection()
          .setInstance('a', {x: most.empty()})
          .setInstance('b', {x: most.empty()})
          .setInstance('c', {y: most.empty(), k});
        const list2 = list1
          .setInstance('c', {z: most.just(1), k})
          .setInstance('d', {z: most.empty()})
          .remove('a', {p: most.empty()});
        const {changed} = calculateDiff(null, list1, list2);
        assert(changed.get('b').index === 0);
        assert(changed.get('c').index === 1);
      });
      
      it('should include an array of changed sinks if one or more sinks changed', () => {
        const list1 = Collection()
          .setInstance('a', {x: most.empty()})
          .setInstance('b', {x: most.empty()})
          .setInstance('c', {y: most.empty()});
        const list2 = list1
          .setInstance('c', {z: most.just(1)})
          .setInstance('d', {z: most.empty()})
          .remove('a', {p: most.empty()});
        const {changed} = calculateDiff(null, list1, list2);
        assert(!changed.get('b').sinks);
        const sinks = changed.get('c').sinks;
        assert(Array.isArray(sinks));
        assert(sinks.length === 2);
        assert(sinks.findIndex(([key, sinks]) => key === 'y' && !sinks) !== -1);
        assert(sinks.findIndex(([key, sinks]) => key === 'z' && isStream(sinks)) !== -1);
      });
    });
  });
});
