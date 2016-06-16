import assert from 'power-assert';
import most from 'most';
import Collection from '../src';
import switchCollection from '../src/switch-collection';
import {run} from 'most-test';
import {isStream, counter} from './helpers';

describe('switchCollection(keys, stream)', () => {
  it('should throw an error if the `keys` argument is not an array', () => {
    assert.throws(() => switchCollection(1, most.empty()));
  });

  it('should throw an error if the `keys` argument is empty', () => {
    assert.throws(() => switchCollection([], most.empty()));
  });

  it('should throw an error if the `stream` argument is not a stream', () => {
    assert.throws(() => switchCollection(['foo'], 1));
  });

  it('should return a stream', () => {
    assert(isStream(switchCollection(['foo'], most.empty())));
  });

  describe('Collection streams', () => {
    it('should propagate an error received from the upstream source', () => {
      const list$ = switchCollection(['foo'], most.throwError(new Error('test-error')));
      const env = run(list$);
      return env.tick(1)
        .then(result => {
          assert(result.error && result.error.message === 'test-error');
        });
    });

    it('should propagate the first error emitted by an active item stream', () => {
      const list = Collection().addInstance({foo: most.throwError(new Error('test-error'))});
      const list$ = switchCollection(['foo'], most.just(list));
      const env = run(list$);
      return env.tick(1)
        .then(result => {
          assert(result.error && result.error.message === 'test-error');
        });
    });
    
    describe('receiving an initial collection', () => {
      describe('with no items', () => {
        it('should end if the upstream source ends', () => {
          const list = Collection();
          const list$ = most.just(list);
          const data$ = switchCollection(['foo'], list$);
          const env = run(data$);
          return env.tick(1)
            .then(result => {
              assert(result.end);
            });
        });
        it('should emit only a list change event', () => {
          const list = Collection();
          const list$ = most.just(list);
          const data$ = switchCollection(['foo'], list$);
          const env = run(data$);
          return env.tick(1)
            .then(result => {
              assert(result.events.length === 1);
              assert(Collection.isCollection(result.events[0].list));
            });
        });
      });

      describe('with no items matching any of the specified sink keys', () => {
        function init() {
          const list = Collection().addInstance({foo: most.just(1)});
          const list$ = most.just(list);
          const data$ = switchCollection(['bar'], list$);
          return run(data$);
        }
        it('should end if the upstream source ends', () => {
          return init().tick(1)
            .then(result => {
              assert(result.end);
            });
        });

        it('should emit an initial null value for each missing sink, so as not to block snapshots', () => {
          return init().tick(1)
            .then(result => {
              assert(result.events.length === 2);
              assert(Collection.isCollection(result.events[0].list));
              assert(result.events[1][1] === 'bar');
              assert(result.events[1][2] === null);
            });
        });
      });

      describe('with items containing the specified sink keys', () => {
        function init(error) {
          const barB$ = error
            ? count(40, 2).continueWith(() => most.throwError(error))
            : count(40, 2);
          const list = Collection()
            .setInstance('a', {foo: count(0, 1), bar: count(10), baz: count(20)})
            .setInstance('b', {foo: count(30, 2), bar: barB$, baz: count(50)})
            .setInstance('c', {foo: count(60), bar: count(70, 1), baz: count(80)});
          const list$ = most.just(list);
          const data$ = switchCollection(['foo', 'bar'], list$).filter(ev => !ev.list);
          return run(data$);
        }

        it('should end if all of the active streams end', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {foo: [1], bar: [11]},
                b: {foo: [31], bar: [41]},
                c: {foo: [61], bar: [71]},
              });
              assert(!result.end);
              return env.tick(1);
            })
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {bar: [12]},
                b: {foo: [32], bar: [42]},
                c: {foo: [62]},
              });
              assert(!result.end);
              return env.tick(1);
            })
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {bar: [13]},
                c: {foo: [63]},
              });
              assert(result.end);
            });
        });

        it('should propagate the first error emitted by an active stream', () => {
          const env = init(new Error('test-error'));
          return env.tick(1)
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {foo: [1], bar: [11]},
                b: {foo: [31], bar: [41]},
                c: {foo: [61], bar: [71]},
              });
              assert(!result.end);
              return env.tick(1);
            })
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {bar: [12]},
                b: {foo: [32], bar: [42]},
                c: {foo: [62]},
              });
              assert(result.error && result.error.message === 'test-error');
            });
        });

        it('should emit data from every stream matching one of the specified sink keys', () => {
          const env = init();
          return env.tick(5)
            .then(result => {
              assert.deepEqual(countEvents(result), {
                a: {foo: 1, bar: 3},
                b: {foo: 2, bar: 2},
                c: {foo: 3, bar: 1}
              });
            });
        });

        it('should not emit data from streams that do not match a specified sink key', () => {
          const env = init();
          return env.tick(5)
            .then(result => {
              assert(!result.events.some(ev => ev[1] === 'baz'));
            });
        });

        it('should emit a triple of [item, sink, data]', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              const ev = result.events[0];
              assert(ev[0] === 'a');
              assert(ev[1] === 'foo');
              assert(ev[2] === 1);
            });
        });
      });
    });

    describe('receiving a subsequent collection', () => {
      describe('having only additional items', () => {
        function init(error) {
          const list = Collection()
            .setInstance('a', {foo: count(0, 1), bar: count(10), baz: count(20)})
            .setInstance('b', {foo: count(30, 2), bar: count(40, 2), baz: count(50)});
          const list2 = list.setInstance('c', {foo: count(60, 3, error), bar: count(70, 1), baz: count(80)});
          const list$ = most.just(list2).delay(1).startWith(list);
          const data$ = switchCollection(['foo', 'bar'], list$).filter(ev => !ev.list);
          return run(data$);
        }

        it('should start emitting data from new streams matching the specified sinks', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              assert(result.events.findIndex(ev => ev[0] === 'c') === -1);
              return env.tick(10);
            })
            .then(result => {
              assert(result.events.findIndex(ev => ev[0] === 'c') > -1);
            });
        });

        it('should not interrupt emission of events from existing active streams', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {foo: [1], bar: [11]},
                b: {foo: [31], bar: [41]}
              });
              return env.tick(1);
            })
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {bar: [12]},
                b: {foo: [32], bar: [42]},
                c: {foo: [61], bar: [71]},
              });
            });
        });

        it('should end when all active streams, old and new, have ended', () => {
          const env = init();
          return env.tick(10)
            .then(result => {
              assert.deepEqual(countEvents(result), {
                a: {foo: 1, bar: 3},
                b: {foo: 2, bar: 2},
                c: {foo: 3, bar: 1}
              });
              assert(result.end);
            });
        });

        it('should also propagate the first error emitted by any of the new streams', () => {
          const env = init(new Error('test-error'));
          return env.tick(10)
            .then(result => {
              assert.deepEqual(countEvents(result), {
                a: {foo: 1, bar: 3},
                b: {foo: 2, bar: 2},
                c: {foo: 3, bar: 1}
              });
              assert(result.error && result.error.message === 'test-error');
            });
        });
      });

      describe('having only removed items', () => {
        function init(throwError) {
          const errorFor = id => throwError ? new Error('test-error:' + id) : void 0;
          const list = Collection()
            .setInstance('a', {foo: count(0, 1), bar: count(10, 4, errorFor('a:bar')), baz: count(20)})
            .setInstance('b', {foo: count(30, 2), bar: count(40, 2), baz: count(50)})
            .setInstance('c', {foo: count(60, 3, errorFor('c:foo')), bar: count(70, 1), baz: count(80)});
          const list2 = list.remove('c');
          const list$ = most.just(list2).delay(1).startWith(list);
          const data$ = switchCollection(['foo', 'bar'], list$).filter(ev => !ev.list);
          return run(data$);
        }

        it('should stop emitting data from streams belonging to removed collection items', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              assert(result.events.findIndex(ev => ev[0] === 'c') > -1);
              return env.tick(10);
            })
            .then(result => {
              assert(result.events.findIndex(ev => ev[0] === 'c') === -1);
            });
        });

        it('should not interrupt emission of events from existing active streams', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {foo: [1], bar: [11]},
                b: {foo: [31], bar: [41]},
                c: {foo: [61], bar: [71]},
              });
              return env.tick(10);
            })
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {bar: [12, 13, 14]},
                b: {foo: [32], bar: [42]}
              });
            });
        });

        it('should end when remaining active streams have ended', () => {
          const env = init();
          return env.tick(10)
            .then(result => {
              assert.deepEqual(countEvents(result), {
                a: {foo: 1, bar: 4},
                b: {foo: 2, bar: 2},
                c: {foo: 1, bar: 1}
              });
              assert(result.end);
            });
        });

        it('should propagate the first error emitted only by remaining streams', () => {
          const env = init(true);
          return env.tick(10)
            .then(result => {
              assert.deepEqual(countEvents(result), {
                a: {foo: 1, bar: 4},
                b: {foo: 2, bar: 2},
                c: {foo: 1, bar: 1}
              });
              assert(result.error && result.error.message === 'test-error:a:bar');
            });
        });
      });

      describe('having updated items', () => {
        function init(throwError) {
          const errorFor = id => throwError ? new Error('test-error:' + id) : void 0;
          const aInitial = {foo: count(0, 50, errorFor('a1:foo')), bar: count(10, 2), baz: count(20)};
          const aUpdated = {foo: count(200, 2, errorFor('a2:foo')), bar: aInitial.bar, baz: aInitial.baz};
          const list = Collection()
            .setInstance('a', aInitial)
            .setInstance('b', {foo: count(30, 2), bar: count(40, 2), baz: count(50)})
            .setInstance('c', {foo: count(60, 4, errorFor('c:bar')), bar: count(70, 1), baz: count(80)});
          const list2 = list.setInstance('a', aUpdated);
          const list$ = most.just(list2).delay(1).startWith(list);
          const data$ = switchCollection(['foo', 'bar'], list$).filter(ev => !ev.list);
          return run(data$);
        }

        it('should stop emitting data from replaced streams and start emitting data from replacement streams', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              const events = groupEvents(result);
              assert.deepEqual(events.a.foo, [1]);
              return env.tick(10);
            })
            .then(result => {
              const events = groupEvents(result);
              assert.deepEqual(events.a.foo, [201, 202]);
            });
        });

        it('should not interrupt emission of events from active unchanged streams in updated items', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              const events = groupEvents(result);
              assert.deepEqual(events.a.bar, [11]);
              return env.tick(10);
            })
            .then(result => {
              const events = groupEvents(result);
              assert.deepEqual(events.a.bar, [12]);
            });
        });

        it('should not interrupt emission of events from existing active streams', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              const events = groupEvents(result);
              assert.deepEqual(events.c.foo, [61]);
              return env.tick(10);
            })
            .then(result => {
              const events = groupEvents(result);
              assert.deepEqual(events.c.foo, [62, 63, 64]);
            });
        });

        it('should end when all active streams, unchanged and updated, have ended', () => {
          const env = init();
          return env.tick(10)
            .then(result => {
              assert.deepEqual(countEvents(result), {
                a: {foo: 3, bar: 2},
                b: {foo: 2, bar: 2},
                c: {foo: 4, bar: 1}
              });
              assert(result.end);
            });
        });

        it('should propagate the first error emitted by any unchanged or updated stream', () => {
          const env = init(true);
          return env.tick(10)
            .then(result => {
              assert.deepEqual(countEvents(result), {
                a: {foo: 3, bar: 2},
                b: {foo: 2, bar: 2},
                c: {foo: 3, bar: 1}
              });
              assert(result.error && result.error.message === 'test-error:a2:foo');
            });
        });
      });

      describe('having no changes to any items', () => {
        function init(throwError) {
          const errorFor = id => throwError ? new Error('test-error:' + id) : void 0;
          const list = Collection()
            .setInstance('a', {foo: count(0, 1, errorFor('a1:foo')), bar: count(10, 2), baz: count(20)})
            .setInstance('b', {foo: count(30, 2), bar: count(40, 2), baz: count(50)})
            .setInstance('c', {foo: count(60, 3, errorFor('c:bar')), bar: count(70, 1), baz: count(80)});
          const list$ = most.just(list).delay(1).startWith(list);
          const data$ = switchCollection(['foo', 'bar'], list$).filter(ev => !ev.list);
          return run(data$);
        }

        it('should not interrupt emission of events from active streams', () => {
          const env = init();
          return env.tick(1)
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {foo: [1], bar: [11]},
                b: {foo: [31], bar: [41]},
                c: {foo: [61], bar: [71]}
              });
              return env.tick(1);
            })
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {bar: [12]},
                b: {foo: [32], bar: [42]},
                c: {foo: [62]}
              });
              return env.tick(2);
            })
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                c: {foo: [63]}
              });
            });
        });

        it('should end when all active streams have ended', () => {
          const env = init();
          return env.tick(10)
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {foo: [1], bar: [11, 12]},
                b: {foo: [31, 32], bar: [41, 42]},
                c: {foo: [61, 62, 63], bar: [71]}
              });
              assert(result.end);
            });
        });

        it('should propagate the first error emitted by any active stream', () => {
          const env = init(true);
          return env.tick(10)
            .then(result => {
              assert.deepEqual(groupEvents(result), {
                a: {foo: [1], bar: [11]},
                b: {foo: [31], bar: [41]},
                c: {foo: [61], bar: [71]}
              });
              assert(result.error && result.error.message === 'test-error:a1:foo');
            });
        });
      });
    });
  });
});

function count(start = 0, max = 3, error) {
  const stream = counter(null, 1, start).skip(1).take(max);
  return error ? stream.continueWith(() => most.throwError(error)) : stream;
}

function countEvents(result) {
  return result.events
    .reduce((acc, ev) => {
      const item = acc[ev[0]] || (acc[ev[0]] = {});
      item[ev[1]] = (item[ev[1]] || 0) + 1;
      return acc;
    }, {});
}

function groupEvents(result) {
  return result.events
    .reduce((acc, ev) => {
      const item = acc[ev[0]] || (acc[ev[0]] = {});
      item[ev[1]] = (item[ev[1]] || []).concat(ev[2]);
      return acc;
    }, {});
}
