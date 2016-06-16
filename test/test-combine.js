import assert from 'power-assert';
import most from 'most';
import {run} from 'most-test';
import Collection from '../src';
import {isStream} from './helpers';

describe('#Collection', () => {
  describe('#combineArray', () => {
    describe('(key: Key)', () => {
      it('should return a stream', () => {
        assert(isStream(Collection().combineArray('foo')));
      });

      it('should emit arrays of values', () => {
        const list = Collection().addInstance({foo: most.just(1)});
        const env = run(list.combineArray('foo'));
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(Array.isArray(result.events[0]));
          });
      });

      it('should emit items in the same order as they appear in the collection', () => {
        const list = Collection()
          .addInstance({foo: most.just(1)})
          .addInstance({foo: most.just(7)})
          .addInstance({foo: most.just(3)});
        const listReversed = Collection(list.state.set('items', list.state.get('items').reverse()));

        const stream1 = list.combineArray('foo');
        const stream2 = listReversed.combineArray('foo');
        const env1 = run(stream1);
        const env2 = run(stream2);

        return env1.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 7, 3]);
            return env2.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [3, 7, 1]);
          });
      });

      it('should populate the array with the latest corresponding sink value from each item in the collection', () => {
        const list = Collection()
          .addInstance({foo: most.just(1)})
          .addInstance({foo: most.just(7).concat(most.just(5).delay(2))})
          .addInstance({foo: most.just(3).concat(most.just(2).delay(3))});

        const stream = list.combineArray('foo');
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 7, 3]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 5, 3]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 5, 2]);
          });
      });
    });

    describe('(keys: Key[])', () => {
      it('should return a stream', () => {
        assert(isStream(Collection().combineArray(['foo', 'bar'])));
      });

      it('should emit arrays of objects', () => {
        const list = Collection()
          .addInstance({foo: most.just(1), bar: most.just(2)})
          .addInstance({foo: most.just(3), bar: most.just(4)});
        const env = run(list.combineArray(['foo', 'bar']));
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(Array.isArray(result.events[0]));
            assert.deepEqual(result.events[0], [
              {foo: 1, bar: 2},
              {foo: 3, bar: 4}
            ]);
          });
      });

      it('should emit items in the same order as they appear in the collection', () => {
        const list = Collection()
          .addInstance({foo: most.just(1), bar: most.just(10)})
          .addInstance({foo: most.just(7), bar: most.just(11)})
          .addInstance({foo: most.just(3), bar: most.just(12)});
        const listReversed = Collection(list.state.set('items', list.state.get('items').reverse()));

        const stream1 = list.combineArray(['foo', 'bar']);
        const stream2 = listReversed.combineArray(['foo', 'bar']);
        const env1 = run(stream1);
        const env2 = run(stream2);

        return env1.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [
              {foo: 1, bar: 10},
              {foo: 7, bar: 11},
              {foo: 3, bar: 12}
            ]);
            return env2.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [
              {foo: 3, bar: 12},
              {foo: 7, bar: 11},
              {foo: 1, bar: 10}
            ]);
          });
      });
    });
  });

  describe('.combineArray', () => {
    describe('(key: Key, list$: Stream<ICollection>)', () => {
      it('should return a stream', () => {
        const stream = Collection.combineArray('foo', most.empty());
        assert(isStream(stream));
      });

      it('should emit arrays of values', () => {
        const list = Collection().addInstance({foo: most.just(1)});
        const stream = Collection.combineArray('foo', most.just(list));
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(Array.isArray(result.events[0]));
          });
      });

      it('should order array elements according to their position in the collection', () => {
        const list = Collection()
          .addInstance({foo: most.just(1)})
          .addInstance({foo: most.just(7)})
          .addInstance({foo: most.just(3)});

        const stream = Collection.combineArray('foo', most.just(list));
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 7, 3]);
          });
      });

      it('should populate emitted arrays with the latest corresponding sink value from each item in the collection', () => {
        const list = Collection()
          .addInstance({foo: most.just(1)})
          .addInstance({foo: most.just(7).concat(most.just(5).delay(2))})
          .addInstance({foo: most.just(3).concat(most.just(2).delay(3))});

        const stream = Collection.combineArray('foo', most.just(list));
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 7, 3]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 5, 3]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 5, 2]);
          });
      });

      it('should reflect changes made to the list in the emitted array', () => {
        const list1 = Collection()
          .setInstance('x', {foo: most.just(1)})
          .setInstance('y', {foo: most.just(7).concat(most.just(5).delay(2))})
          .setInstance('z', {foo: most.just(3).concat(most.just(2).delay(3))});
        const list2 = list1
          .setInstance('k', {foo: most.just(4)})
          .setInstance('y', {foo: most.just(33)});
        const list$ = most.just(list1).concat(most.just(list2).delay(2));

        const stream = Collection.combineArray('foo', list$);
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 7, 3]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 33, 3, 4]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [1, 33, 2, 4]);
            assert(result.end);
          });
      });
    });

    describe('(keys: Key[], list$: Stream<ICollection>)', () => {
      it('should return a stream', () => {
        const stream = Collection.combineArray(['foo', 'bar'], most.empty());
        assert(isStream(stream));
      });

      it('should emit arrays of objects mapping sinks to their latest values', () => {
        const list = Collection()
          .addInstance({foo: most.just(1), bar: most.just(2)})
          .addInstance({foo: most.just(3), bar: most.just(4)});
        const stream = Collection.combineArray(['foo', 'bar'], most.just(list));
        const env = run(stream);
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(result.events[0]);
            assert.deepEqual(result.events[0], [
              {foo: 1, bar: 2},
              {foo: 3, bar: 4}
            ]);
          });
      });
      
      it('should order array elements according to their position in the collection', () => {
        const list = Collection()
          .addInstance({foo: most.just(1), bar: most.just(10)})
          .addInstance({foo: most.just(7), bar: most.just(11)})
          .addInstance({foo: most.just(3), bar: most.just(12)});
        const listReversed = Collection(list.state.set('items', list.state.get('items').reverse()));

        const stream1 = Collection.combineArray(['foo', 'bar'], most.just(list));
        const stream2 = Collection.combineArray(['foo', 'bar'], most.just(listReversed));
        const env1 = run(stream1);
        const env2 = run(stream2);

        return env1.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [
              {foo: 1, bar: 10},
              {foo: 7, bar: 11},
              {foo: 3, bar: 12}
            ]);
            return env2.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [
              {foo: 3, bar: 12},
              {foo: 7, bar: 11},
              {foo: 1, bar: 10}
            ]);
          });
      });

      it('should reflect changes made to the list in the emitted objects', () => {
        const list1 = Collection()
          .setInstance('x', {foo: most.just(1), bar: most.just(100)})
          .setInstance('y', {foo: most.just(7).concat(most.just(5).delay(2)), bar: most.just(101)})
          .setInstance('z', {foo: most.just(3).concat(most.just(2).delay(3)), bar: most.just(102)});
        const list2 = list1
          .setInstance('k', {foo: most.just(4), bar: most.just(103)})
          .setInstance('y', {foo: most.just(33), bar: most.just(104)});
        const list$ = most.just(list1).concat(most.just(list2).delay(2));

        const stream = Collection.combineArray(['foo', 'bar'], list$);
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [{foo: 1, bar: 100}, {foo: 7, bar: 101}, {foo: 3, bar: 102}]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [{foo: 1, bar: 100}, {foo: 33, bar: 104}, {foo: 3, bar: 102}, {foo: 4, bar: 103}]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], [{foo: 1, bar: 100}, {foo: 33, bar: 104}, {foo: 2, bar: 102}, {foo: 4, bar: 103}]);
            assert(result.end);
          });
      });
    });
  });

  describe('#combineObject', () => {
    describe('(key: Key)', () => {
      it('should return a stream', () => {
        assert(isStream(Collection().combineObject('foo')));
      });

      it('should emit objects containing a key for each item in the collection', () => {
        const list = Collection()
          .setInstance('x', {foo: most.just(1)})
          .setInstance('y', {foo: most.just(7)})
          .setInstance('z', {foo: most.just(3)});
        
        const stream = list.combineObject('foo');
        const env = run(stream);
        
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(Object.keys(result.events[0]).length === 3);
            assert('x' in result.events[0]);
            assert('y' in result.events[0]);
            assert('z' in result.events[0]);
          });
      });

      it('should map each item key to the latest value emitted by the specified sink for each corresponding collection item', () => {
        const list = Collection()
          .setInstance('x', {foo: most.just(1)})
          .setInstance('y', {foo: most.just(13).delay(2).startWith(7)})
          .setInstance('z', {foo: most.just(17).delay(3).startWith(3)});
        
        const stream = list.combineObject('foo');
        const env = run(stream);
        
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 7, z: 3});
            assert(!result.end);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 13, z: 3});
            assert(!result.end);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 13, z: 17});
            assert(result.end);
          });
      });
    });

    describe('(keys: Key[])', () => {
      it('should return a stream', () => {
        assert(isStream(Collection().combineObject('foo')));
      });

      it('should emit objects containing a key for each item in the collection', () => {
        const list = Collection()
          .setInstance('x', {foo: most.just(1), bar: most.just(10)})
          .setInstance('y', {foo: most.just(7), bar: most.just(11)})
          .setInstance('z', {foo: most.just(3), bar: most.just(12)});
        
        const stream = list.combineObject(['foo', 'bar']);
        const env = run(stream);
        
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(Object.keys(result.events[0]).length === 3);
            assert('x' in result.events[0]);
            assert('y' in result.events[0]);
            assert('z' in result.events[0]);
          });
      });

      it('should map each item key to an object of sink:value pairs, where the value is the latest value emitted by its corresponding sink in the collection item', () => {
        const list = Collection()
          .setInstance('x', {foo: most.just(1), bar: most.just(100)})
          .setInstance('y', {foo: most.just(7).concat(most.just(5).delay(2)), bar: most.just(101).delay(2).startWith(99)})
          .setInstance('z', {foo: most.just(3).concat(most.just(2).delay(3)), bar: most.just(102)});

        const stream = list.combineObject(['foo', 'bar']);
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {
              x: {foo: 1, bar: 100},
              y: {foo: 7, bar: 99},
              z: {foo: 3, bar: 102}
            });
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 2);
            assert.deepEqual(result.events, [{
              x: {foo: 1, bar: 100},
              y: {foo: 5, bar: 99},
              z: {foo: 3, bar: 102}
            },
            {
              x: {foo: 1, bar: 100},
              y: {foo: 5, bar: 101},
              z: {foo: 3, bar: 102}
            }]);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {
              x: {foo: 1, bar: 100},
              y: {foo: 5, bar: 101},
              z: {foo: 2, bar: 102}
            });
            assert(result.end);
          });
      });
    });
  });

  describe('.combineObject', () => {
    describe('(key: Key, list$: Stream<ICollection>)', () => {
      it('should return a stream', () => {
        assert(isStream(Collection.combineObject('foo', most.empty())));
      });

      it('should emit objects containing a key for each item in the collection', () => {
        const list = Collection()
          .setInstance('x', {foo: most.just(1)})
          .setInstance('y', {foo: most.just(7)})
          .setInstance('z', {foo: most.just(3)});
        
        const stream = Collection.combineObject('foo', most.just(list));
        const env = run(stream);
        
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(Object.keys(result.events[0]).length === 3);
            assert('x' in result.events[0]);
            assert('y' in result.events[0]);
            assert('z' in result.events[0]);
          });
      });

      it('should map each item key to the latest value emitted by the specified sink for each corresponding collection item', () => {
        const list = Collection()
          .setInstance('x', {foo: most.just(1)})
          .setInstance('y', {foo: most.just(13).delay(2).startWith(7)})
          .setInstance('z', {foo: most.just(17).delay(3).startWith(3)});
        
        const stream = Collection.combineObject('foo', most.just(list));
        const env = run(stream);
        
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 7, z: 3});
            assert(!result.end);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 13, z: 3});
            assert(!result.end);
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 13, z: 17});
            assert(result.end);
          });
      });

      it('should reflect changes made to the list in the emitted object', () => {
        const list1 = Collection()
          .setInstance('x', {foo: most.just(1)})
          .setInstance('y', {foo: most.just(7).concat(most.just(5).delay(2))})
          .setInstance('z', {foo: most.just(3).concat(most.just(2).delay(3))});
        const list2 = list1
          .setInstance('k', {foo: most.just(4)})
          .setInstance('y', {foo: most.just(33)});
        const list$ = most.just(list1).concat(most.just(list2).delay(2));

        const stream = Collection.combineObject('foo', list$);
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 7, z: 3});
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 33, z: 3, k: 4});
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {x: 1, y: 33, z: 2, k: 4});
            assert(result.end);
          });
      });
    });

    describe('(keys: Key[], list$: Stream<ICollection>)', () => {
      it('should return a stream', () => {
        assert(isStream(Collection.combineObject(['foo', 'bar'], most.empty())));
      });

      it('should emit objects containing a key for each item in the collection', () => {
        const list = Collection()
          .setInstance('x', {foo: most.just(1), bar: most.just(10)})
          .setInstance('y', {foo: most.just(7), bar: most.just(11)})
          .setInstance('z', {foo: most.just(3), bar: most.just(12)});
        
        const stream = Collection.combineObject(['foo', 'bar'], most.just(list));
        const env = run(stream);
        
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert(Object.keys(result.events[0]).length === 3);
            assert('x' in result.events[0]);
            assert('y' in result.events[0]);
            assert('z' in result.events[0]);
          });
      });

      it('should map each item key to a child object of sink:value pairs, where the value is the latest value emitted by its corresponding sink in the collection item', () => {
        const list = Collection()
          .setInstance('x', {foo: most.just(1), bar: most.just(10)})
          .setInstance('y', {foo: most.just(7), bar: most.just(11)})
          .setInstance('z', {foo: most.just(3), bar: most.just(12)});
        
        const stream = Collection.combineObject(['foo', 'bar'], most.just(list));
        const env = run(stream);
        
        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert('foo' in result.events[0].x);
            assert('bar' in result.events[0].x);
            assert('foo' in result.events[0].y);
            assert('bar' in result.events[0].y);
            assert('foo' in result.events[0].z);
            assert('bar' in result.events[0].z);
          });
      });

      it('should reflect changes made to the list in the emitted object', () => {
        const list1 = Collection()
          .setInstance('x', {foo: most.just(1), bar: most.just(100)})
          .setInstance('y', {foo: most.just(7).concat(most.just(5).delay(2)), bar: most.just(101)})
          .setInstance('z', {foo: most.just(3).concat(most.just(2).delay(3)), bar: most.just(102)});
        const list2 = list1
          .setInstance('k', {foo: most.just(4), bar: most.just(103)})
          .setInstance('y', {foo: most.just(33), bar: most.just(104)});
        const list$ = most.just(list1).concat(most.just(list2).delay(2));

        const stream = Collection.combineObject(['foo', 'bar'], list$);
        const env = run(stream);

        return env.tick(1)
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {
              x: {foo: 1, bar: 100},
              y: {foo: 7, bar: 101},
              z: {foo: 3, bar: 102}
            });
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {
              x: {foo: 1, bar: 100},
              y: {foo: 33, bar: 104},
              z: {foo: 3, bar: 102},
              k: {foo: 4, bar: 103}
            });
            return env.tick(1);
          })
          .then(result => {
            assert(result.events.length === 1);
            assert.deepEqual(result.events[0], {
              x: {foo: 1, bar: 100},
              y: {foo: 33, bar: 104},
              z: {foo: 2, bar: 102},
              k: {foo: 4, bar: 103}
            });
            assert(result.end);
          });
      });
    });
  });
});
