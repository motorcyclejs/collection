import assert from 'power-assert';
import most from 'most';
import Collection from '../src';
import switchCollection from '../src/switch-collection';
import snapshot from '../src/snapshot';
import {run} from 'most-test';

describe('snapshot(keys, stream)', () => {
  describe('a stream with an initial collection', () => {
    describe('containing no items', () => {
      function init() {
        const stream = snapshot(switchCollection(['foo'], most.just(Collection())));
        return run(stream);
      }

      it('should emit an initial snapshot if empty', () => {
        const env = init();
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(result.events[0].size === 0);
          });
      });

      it('should end if the collection stream ends', () => {
        const env = init();
        return env.tick(1)
          .then(result => {
            assert(result.end);
          });
      });
    });

    describe('containing one or more items', () => {
      function init() {
        const list = Collection()
          .setInstance('a', {foo: most.just(1).continueWith(() => most.just(4).delay(3)), bar: most.just(3).delay(2)})
          .setInstance('b', {foo: most.just(2).continueWith(() => most.just(5).delay(10))});
        const stream = snapshot(switchCollection(['foo', 'bar'], most.never().startWith(list)));
        return run(stream);
      }

      it('should wait for the first value from each matching sink before emitting an initial snapshot', () => {
        const env = init();
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 0);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert(result.events[0].size === 2);
            const changes = result.events[0].toArray().map(m => m.toJS()); // index-based order of changes is not guaranteed
            assert(changes[0].sinks.foo === 1);
            assert(changes[0].sinks.bar === 3);
            assert(changes[1].sinks.foo === 2);
            assert(changes[1].sinks.bar === void 0);
          });
      });

      it('should emit snapshots for every subsequent value emitted by any sink', () => {
        const env = init();
        return env.tick(2)
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 1, bar: 3}},
              {itemKey: 'b', index: 1, sinks: {foo: 2, bar: void 0}}
            ]);
            return env.tick(2);
          })
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 4, bar: 3}},
              {itemKey: 'b', index: 1, sinks: {foo: 2, bar: void 0}}
            ]);
            return env.tick(10);
          })
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 4, bar: 3}},
              {itemKey: 'b', index: 1, sinks: {foo: 5, bar: void 0}}
            ]);
          });
      });
    });
  });

  describe('a stream with a subsequent collection', () => {
    describe('having an unchanged set of items', () => {
      it('should not trigger an emission if empty', () => {
        const stream = snapshot(switchCollection(['foo'], most.just(Collection()).concat(most.just(Collection()).delay(2))));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            return env.tick(5);
          })
          .then(result => {
            assert(result.events.length === 0);
            assert(result.end);
          });
      });

      it('should not trigger an emission if not empty', () => {
        const list = Collection().addInstance({foo: most.just(1)});
        const stream = snapshot(switchCollection(['foo'], most.just(list).concat(most.just(list).delay(2))));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            return env.tick(5);
          })
          .then(result => {
            assert(result.events.length === 0);
            assert(result.end);
          });
      });
    });
    
    describe('having one or more items removed', () => {
      it('should not trigger an emission if initial data is still pending for any remaining sinks', () => {
        const list1 = Collection()
          .setInstance('a', {foo: most.just(1).delay(5)})
          .setInstance('b', {foo: most.just(2)});
        const list2 = list1.remove('b');
        const stream = snapshot(switchCollection(['foo'], most.just(list1).concat(most.just(list2).delay(2))));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 0);
            return env.tick(2);
          })
          .then(result => {
            assert(result.events.length === 0);
            assert(!result.end);
          });
      });

      it('should be followed by an emission when initially-pending sink data is finally resolved', () => {
        const list1 = Collection()
          .setInstance('a', {foo: most.just(1).delay(5)})
          .setInstance('b', {foo: most.just(2)});
        const list2 = list1.remove('b');
        const stream = snapshot(switchCollection(['foo'], most.just(list1).concat(most.just(list2).delay(2))));
        const env = run(stream);
        return env.tick(10)
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [{itemKey: 'a', index: 0, sinks: {foo: 1}}]);
            assert(result.end);
          });
      });

      it('should trigger an emission if no sinks had pending data', () => {
        const list1 = Collection()
          .setInstance('a', {foo: most.just(1)})
          .setInstance('b', {foo: most.just(2)});
        const list2 = list1.remove('b');
        const stream = snapshot(switchCollection(['foo'], most.just(list1).concat(most.just(list2).delay(2))));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 1}},
              {itemKey: 'b', index: 1, sinks: {foo: 2}}
            ]);
            assert(!result.end);
            return env.tick(2);
          })
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 1}}
            ]);
            assert(result.end);
          });
      });

      it('should trigger an emission if the only pending data was for sinks that were removed', () => {
        const list1 = Collection()
          .setInstance('a', {foo: most.just(1)})
          .setInstance('b', {foo: most.just(2).delay(5)});
        const list2 = list1.remove('b');
        const stream = snapshot(switchCollection(['foo'], most.just(list1).concat(most.just(list2).delay(2))));
        const env = run(stream);
        return env.tick(2)
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [{itemKey: 'a', index: 0, sinks: {foo: 1}}]);
            assert(result.end);
          });
      });
    });
    
    describe('having one or more items added', () => {
      it('should not trigger an emission independently of the data emitted by the added sinks', () => {
        const list1 = Collection().setInstance('a', {foo: most.just(1)});
        const list2 = list1.setInstance('b', {foo: most.just(2).delay(2)});
        const stream = snapshot(switchCollection(['foo'], most.just(list1).concat(most.just(list2).delay(2))));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [{itemKey: 'a', index: 0, sinks: {foo: 1}}]);
            assert(!result.end);
            return env.tick(2);
          })
          .then(result => {
            assert(result.events.length === 0);
            assert(!result.end);
          });
      });

      it('should trigger a subsequent emission only when all of the added sinks have emitted their first value', () => {
        const list1 = Collection().setInstance('a', {foo: most.just(1), bar: most.just(10)});
        const list2 = list1.setInstance('b', {foo: most.just(2).delay(2), bar: most.just(20).delay(3)});
        const list$ = most.just(list1).concat(most.just(list2).delay(2));
        const stream = snapshot(switchCollection(['foo', 'bar'], list$));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 1, bar: 10}}
            ]);
            assert(!result.end);
            return env.tick(10);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0].toArray().map(m => m.toJS()), [
              {itemKey: 'a', index: 0, sinks: {foo: 1, bar: 10}},
              {itemKey: 'b', index: 1, sinks: {foo: 2, bar: 20}}
            ]);
            assert(result.end);
          });
      });
    });
    
    describe('having one or more items changed', () => {
      it('should trigger an emission if the only changes were to the order of items', () => {
        const list1 = Collection()
          .setInstance('a', {foo: most.just(1)})
          .setInstance('b', {foo: most.just(2)});
        const list2 = Collection(list1.state.set('items', list1.state.get('items').reverse()));
        
        const list$ = most.just(list1).concat(most.just(list2).delay(2));
        const stream = snapshot(switchCollection(['foo'], list$));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0].toArray().map(m => m.toJS()), [
              {itemKey: 'a', index: 0, sinks: {foo: 1}},
              {itemKey: 'b', index: 1, sinks: {foo: 2}}
            ]);
            assert(!result.end);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0].toArray().map(m => m.toJS()), [
              {itemKey: 'b', index: 0, sinks: {foo: 2}},
              {itemKey: 'a', index: 1, sinks: {foo: 1}}
            ]);
            assert(result.end);
          });
      });
      
      it('should not trigger an emission independently of sink emissions if any sinks were changed', () => {
        const sinks = {foo: most.just(1), bar: most.just(10)};
        const list1 = Collection().setInstance('a', sinks);
        const list2 = list1.setInstance('b', {foo: sinks.foo, bar: most.just(20).delay(3)});
        const list$ = most.just(list1).concat(most.just(list2).delay(2));
        const stream = snapshot(switchCollection(['foo', 'bar'], list$));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 1, bar: 10}}
            ]);
            assert(!result.end);
            return env.tick(2);
          })
          .then(result => {
            assert(result.events.length === 0);
            assert(!result.end);
          });
      });

      it('should not trigger a subsequent emission until each of the replaced sinks have emitted their first value', () => {
        const sinks = {foo: most.just(1), bar: most.just(10)};
        const list1 = Collection().setInstance('a', sinks);
        const list2 = list1.setInstance('a', {foo: sinks.foo, bar: most.just(20).delay(3)});
        const list$ = most.just(list1).concat(most.just(list2).delay(2));
        const stream = snapshot(switchCollection(['foo', 'bar'], list$));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 1, bar: 10}}
            ]);
            assert(!result.end);
            return env.tick(5);
          })
          .then(result => {
            assert(result.events.length === 1);
            const changes = result.events[0].toArray().map(m => m.toJS());
            assert.deepEqual(changes, [
              {itemKey: 'a', index: 0, sinks: {foo: 1, bar: 20}}
            ]);
            assert(result.end);
          });
      });
    });
  });
});