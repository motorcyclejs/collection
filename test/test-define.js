import assert from 'power-assert';
import Immutable from 'immutable';
import Collection from '../src';
import {componentTypeDefaults} from '../src/collection';

describe('Collection', () => {
  describe('#define()', () => {
    describe('(...any)', () => {
      function Test() {}
      let initialList = void 0;
      let list_fn = void 0;
      let list_id_fn = void 0;
      let list_id_opt = void 0;
      let list_opt = void 0;

      beforeEach(() => {
        initialList = Collection();
        list_fn = initialList.define(Test);
        list_id_fn = initialList.define('foo', Test);
        list_id_opt = initialList.define('foo', {fn: Test});
        list_opt = initialList.define({fn: Test});
      });

      afterEach(() => {
        list_fn = void 0;
        list_id_fn = void 0;
        list_id_opt = void 0;
        list_opt = void 0;
      });

      it('should return an updated copy of the collection', () => {
        assert(initialList !== list_fn);
        assert(initialList !== list_id_fn);
        assert(initialList !== list_id_opt);
        assert(initialList !== list_opt);
        assert(!Immutable.is(initialList.state, list_fn.state));
        assert(!Immutable.is(initialList.state, list_id_fn.state));
        assert(!Immutable.is(initialList.state, list_id_opt.state));
        assert(!Immutable.is(initialList.state, list_opt.state));
      });

      it('should add an entry to the types registry', () => {
        assert(initialList.state.get('types').size === 0);
        assert(list_fn.state.get('types').size === 1);
        assert(list_id_fn.state.get('types').size === 1);
        assert(list_id_opt.state.get('types').size === 1);
        assert(list_opt.state.get('types').size === 1);
      });
    });

    describe('(fn: Component)', () => {
      function Test() {}
      let initialList = void 0;
      let updatedList = void 0;

      beforeEach(() => {
        initialList = Collection();
        updatedList = initialList.define(Test);
      });

      afterEach(() => {
        initialList = void 0;
        updatedList = void 0;
      });

      it('should use the function name as the type key', () => {
        assert(updatedList.state.hasIn(['types', 'Test']));
      });

      it('should store the function as the fn property', () => {
        assert(updatedList.state.getIn(['types', 'Test'], {}).fn === Test);
      });
    });

    describe('(type: TypeIdentifier, fn: Component)', () => {
      function Test() {}
      let initialList = void 0;
      let updatedList = void 0;

      beforeEach(() => {
        initialList = Collection();
        updatedList = initialList.define('foo', Test);
      });

      afterEach(() => {
        initialList = void 0;
        updatedList = void 0;
      });

      it('should use the first argument as the type key', () => {
        assert(updatedList.state.hasIn(['types', 'foo']));
      });

      it('should store the function as the fn property', () => {
        assert(updatedList.state.getIn(['types', 'foo'], {}).fn === Test);
      });
    });

    describe('(type: TypeIdentifier, options: ComponentDefinition)', () => {
      function Test() {}
      const options = Object.freeze({fn: Test});
      let initialList = void 0;
      let updatedList = void 0;

      beforeEach(() => {
        initialList = Collection();
        updatedList = initialList.define('foo', options);
      });

      afterEach(() => {
        initialList = void 0;
        updatedList = void 0;
      });

      it('should use the first argument as the type key', () => {
        assert(updatedList.state.hasIn(['types', 'foo']));
      });

      it('should store the function as the fn property', () => {
        assert(updatedList.state.getIn(['types', 'foo'], {}).fn === Test);
      });
    });

    describe('(options: ComponentDefinition)', () => {
      function Test() {}
      const blankFn = (function() { return function(){}; })();
      const options_key_fn = Object.freeze({key: 'foo', fn: Test});
      const options_fn = Object.freeze({fn: Test});
      const options_fn_blank = Object.freeze({fn: blankFn});
      let initialList = void 0;
      let list_key_fn = void 0;
      let list_fn = void 0;
      let list_fn_blank = void 0;

      beforeEach(() => {
        initialList = Collection();
        list_key_fn = initialList.define(options_key_fn);
        list_fn = initialList.define(options_fn);
        list_fn_blank = initialList.define(options_fn_blank);
      });

      afterEach(() => {
        initialList = void 0;
        list_key_fn = void 0;
        list_fn = void 0;
        list_fn_blank = void 0;
      });

      it('should use the key property, if present, as the type key', () => {
        assert(list_key_fn.state.hasIn(['types', 'foo']));
        assert(list_key_fn.state.get('types').size === 1);
      });

      it('should, if no key property is present, use the function name as the type key', () => {
        assert(list_fn.state.hasIn(['types', 'Test']));
        assert(list_fn.state.get('types').size === 1);
      });

      it('should use the type key "_default" if no type key is present and the function name is blank', () => {
        assert(list_fn_blank.state.hasIn(['types', '_default']));
        assert(list_fn_blank.state.get('types').size === 1);
      });

      it('should retain the other properties in the options object', () => {
        assert(list_key_fn.state.getIn(['types', 'foo'], {}).fn === Test);
        assert(list_fn.state.getIn(['types', 'Test'], {}).fn === Test);
        assert(list_fn_blank.state.getIn(['types', '_default'], {}).fn === blankFn);
      });

      it('should be assigned a set of default properties for that type, where not specified', () => {
        const type_key_fn = list_key_fn.state.getIn(['types', 'foo'], {});
        assert(type_key_fn.instantiate === componentTypeDefaults.instantiate);

        const type_fn = list_fn.state.getIn(['types', 'Test'], {});
        assert(type_fn.instantiate === componentTypeDefaults.instantiate);

        const type_fn_blank = list_fn_blank.state.getIn(['types', '_default'], {});
        assert(type_fn_blank.instantiate === componentTypeDefaults.instantiate);
      });
    });
  });
});
