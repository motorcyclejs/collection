import assert from 'power-assert';
import * as most from 'most';
import {run} from 'most-test';
import Collection from '../src';

import {isStream, periodic} from './helpers';

describe('Collection', () => {
  const list = Collection()
    .addInstance({
      foo: periodic(1).scan(i => i + 1, 0).map(i => `x${i}`),
      bar: periodic(1)
        .scan(i => i + 1, 20)
        .map(i => `y${i}`),
      baz: most.just(10)
    })
    .addInstance({
      bar: periodic(1)
        .delay(1)
        .scan(i => i + 1, 0)
        .map(i => `z${i}`),
      baz: most.just(20)
    });

  describe('#merge: (key: Key)', () => {
    it('should return a stream', () => {
      const stream = list.merge('x');
      assert(isStream(stream));
    });

    it('should merge all items containing the specified sink key', () => {
      const stream = list.merge('bar');
      const env = run(stream);
      return env.tick(2)
        .then(result => {
          assert.deepEqual(result.events, ['y20', 'z0', 'y21', 'z1', 'y22']);
        });
    });

    it('should return an empty stream if there are no matching sinks', () => {
      const stream = list.merge('none');
      const env = run(stream);
      return env.tick(1)
        .then(result => {
          assert.deepEqual(result, {events: [], end: true});
        });
    });

    it('should end when all of the merged streams have ended', () => {
      const stream = list.merge('baz');
      const env = run(stream);
      return env.tick(1)
        .then(result => {
          assert.deepEqual(result, {events: [10, 20], end: true});
        });
    });
  });

  describe('.merge: (key: Key, list$: Stream<ICollection>)', () => {
    it('should return a stream', () => {
      const list$ = most.just(list);
      const bar$ = Collection.merge('bar', list$);
      assert(isStream(bar$));
    });

    it('should end when the list stream ends', () => {
      const bar$ = Collection.merge('bar', most.empty());
      const env = run(bar$);
      return env.tick(1)
        .then(result => {
          assert(result.end);
        });
    });

    it('should not emit data from sinks that did not match the specified key', () => {
        const list$ = most.just(list);
        const bar$ = Collection.merge('none', list$);
        const env = run(bar$);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 0);
            assert(result.end);
          });
    });
    
    describe('when no lists have been emitted yet', () => {
      it('should not emit anything', () => {
        const list$ = most.empty();
        const x$ = Collection.merge('x', list$);
        const env = run(x$);
        return env.tick(1)
          .then(result => {
            assert.deepEqual(result, {events: [], end: true});
          });
        });
    });

    describe('when the first list has been emitted', () => {
      it('should merge all matching sinks in the emitted list', () => {
        const list$ = most.just(list);
        const bar$ = Collection.merge('bar', list$);
        const env = run(bar$);
        return env.tick(2)
          .then(result => {
            assert.deepEqual(result.events, ['y20', 'z0', 'y21', 'z1', 'y22']);
          });
      });
    });

    describe('when a subsequent list is emitted', () => {
      it('should stop emitting items from sinks that are no longer present in the latest list', () => {
        const list2 = list.removeAt(0);
        const list$ = most.just(list2).delay(4).startWith(list);
        const env = run(Collection.merge('bar', list$));
        return env.tick(3)
          .then(result => {
            assert.deepEqual(result.events, ['y20', 'z0', 'y21', 'z1', 'y22', 'z2', 'y23']);
            return env.tick(3);
          })
          .then(result => {
            assert.deepEqual(result.events, ['z3', 'z4', 'z5']);
          });
      });

      it('should begin emitting items from newly-matching sinks present in the latest list', () => {
        const list2 = list.addInstance({
          bar: most.just('new')
        });
        const list$ = most.just(list2).delay(4).startWith(list);
        const env = run(Collection.merge('bar', list$));
        return env.tick(3)
          .then(result => {
            assert.deepEqual(result.events, ['y20', 'z0', 'y21', 'z1', 'y22', 'z2', 'y23']);
            return env.tick(1);
          })
          .then(result => {
            assert.deepEqual(result.events, ['z3', 'y24', 'new']);
          });
      });
    });
  });

  describe('#merge: (keys: Key[])', () => {
    it('should return an object with a stream for each specified key', () => {
      const list = Collection();
      const sinks = list.merge(['foo', 'bar']);
      assert(isStream(sinks.foo));
      assert(isStream(sinks.bar));
    });

    it('should be a shortcut for calling the merge() instance method on each key individually', () => {
      const list = Collection()
        .addInstance({foo: most.just(1)})
        .addInstance({foo: most.just(2)});
      const sinks1 = list.merge(['foo', 'bar']);
      const sinks2 = {
        foo: list.merge('foo'),
        bar: list.merge('bar')
      };
      assert.deepEqual(sinks1, sinks2);
    });
  });

  describe('.merge: (keys: Key[], list$: Stream<ICollection>)', () => {
    it('should return an object with a stream for each specified key', () => {
      const list = Collection();
      const sinks = Collection.merge(['foo', 'bar'], most.just(list));
      assert(isStream(sinks.foo));
      assert(isStream(sinks.bar));
    });

    it('should be a shortcut for calling the static Collection.merge() function on each key individually', () => {
      const list = Collection()
        .addInstance({foo: most.just(1), bar: most.just(10)})
        .addInstance({foo: most.just(2), bar: most.just(20)});
      const list$ = most.just(list);
      const sinks1 = Collection.merge(['foo', 'bar'], list$);
      const sinks2 = {
        foo: Collection.merge('foo', list$),
        bar: Collection.merge('bar', list$)
      };
      const p1foo = run(sinks1.foo).tick(1);
      const p1bar = run(sinks1.bar).tick(1);
      const p2foo = run(sinks2.foo).tick(1);
      const p2bar = run(sinks2.bar).tick(1);
      return Promise.all([p1foo, p1bar, p2foo, p2bar])
        .then(results => {
          assert.deepEqual(results.slice(0, 2), results.slice(2, 4));
        });
    });

    it('should not emit data from sinks that did not match the specified keys', () => {
      const list$ = most.just(list);
      const sinks = Collection.merge(['none', 'zero'], list$);
      const env1 = run(sinks.none);
      const env2 = run(sinks.zero);
      return env1.tick(1)
        .then(result => {
          assert(result.events.length === 0);
          assert(result.end);
          return env2.tick(1);
        })
        .then(result => {
          assert(result.events.length === 0);
          assert(result.end);
        });
    });
  });
});
