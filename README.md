# Component Collections for [Motor]Cycle.js

[![Build Status](https://travis-ci.org/motorcyclejs/collection.svg?branch=master)](https://travis-ci.org/motorcyclejs/collection)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/cyclejs/core)

This is a library to make management of collections of child components much easier, and was inspired by [Nick Johnstone](https://github.com/Widdershin)'s excellent [collection](https://github.com/cyclejs/collection) library for [Cycle.js](http://cycle.js.org/) and [xstream](https://github.com/staltz/xstream). It's based on [Most.js](https://github.com/cujojs/most) streams (as are all Motorcycle packages) and while it shares some similarities with [cycle/collection](https://github.com/cyclejs/collection), it was written from scratch as a universal way to manage and combine sets of child components in general, whether they're known about in advance, such as the different sections of a web page, or dynamically changing in length, such as for a live stream of messages.

**Note: this library is fully functional, well-tested and perfectly valid for use in new and existing projects. Ongoing development is on hold though, and will be largely superceded by [Collectable.js](https://github.com/frptools/collectable) and [Salix](https://github.com/frptools/salix), which aim to solve this particular use case at a more fundamental level.**

## Contents

- [Features](#features)
- [Installation](#installation)
- [Tutorial and Guide](#tutorial-and-guide)
  - [Managing child components](#managing-child-components)
  - [Replacing a child component when state changes](#replacing-a-child-component-when-state-changes)
  - [Combining multiple sinks from child components](#combining-multiple-sinks-from-child-components)
  - [Simple merging of a common sink to a derivative stream](#simple-merging-of-a-common-sink-to-a-derivative-stream)
  - [Dynamic lists of child components](#dynamic-lists-of-child-components)
  - [Managing lists of components that don't have a key](#managing-lists-of-components-that-dont-have-a-key)
  - [Handling multiple component types in a single list](#handling-multiple-component-types-in-a-single-list)
  - [Taking control of a component's lifecycle within a list](#taking-control-of-a-components-lifecycle-within-a-list)
- [API Reference](#api-reference)
  - [API Specification](#api-specification)
  - [Types Reference](#types-reference)

## Features

- **Immutable** by default; perfect for managing using `scan`, `loop`, `map` and others.
- Can be used as both as a dictionary or as a list, with methods to generate unique keys if not specified when adding an item to a collection
- Define an arbitrary number of component types that the list will support
- Add, update and remove any number of children of any of the component types defined for the collection
- Collection size grows and shrinks dynamically
- Manage as a dynamic array of components for cases such as lists, or set children by key to streamline the management of different predefined sections of a page
- Merge children into unified groups of arbitrary sinks that the parent component can return directly or merge with its own local streams
- Automatically project a common sink from each child to an array of the most recent values from each child component; ideal for use with `map`, `combine` and `combineArray`
- Customizable lifecycle operations for each defined component type, including instantiation, equality and sort comparison operations
- Well-tested with almost 200 unit tests

#### Future Enhancements
- Support for _slice_, _skip_, _take_, _orderBy_ and _filter_ to transform the list and efficiently handle rendering, paging and filtering of very large collections and to make it possible to prevent unnecessary processing of offscreen list items
- Automatic provision of an additional source stream to each child component so that the component has access to item-specific list metadata, such as the list size, the index of the item in the list and so forth

## Installation

```
npm install --save @motorcycle/collection
```

Reference the library using an `import` or `require` statement:

```js
import collection from '@motorcycle/collection'
// or
const collection = require('@motorcycle/collection')
```

## Tutorial and Guide

_Motorcycle Collections_ are a great way not only to manage dynamic lists of a components in an application, but to manage your application's graph of child components in general.

- [Managing child components](#managing-child-components)
- [Replacing a child component when state changes](#replacing-a-child-component-when-state-changes)
- [Combining multiple sinks from child components](#combining-multiple-sinks-from-child-components)
- [Simple merging of a common sink to a derivative stream](#simple-merging-of-a-common-sink-to-a-derivative-stream)
- [Dynamic lists of child components](#dynamic-lists-of-child-components)
- [Managing lists of components that don't have a key](#managing-lists-of-components-that-dont-have-a-key)
- [Handling multiple component types in a single list](#handling-multiple-component-types-in-a-single-list)
- [Taking control of a component's lifecycle within a list](#taking-control-of-a-components-lifecycle-within-a-list)

### Getting started

All of the examples below assume the same basic setup described in this tutorial, which uses the simple HTML code below. It is up to you to use Webpack, Browserify or some other solution to bundle your code into the referenced main.js script referenced in the HTML header. DOM functions such as `div` and `header` are part of the HyperScript Helpers library re-exported as part of the Motorcycle DOM library. The first tutorial below shows standard imports and the basic application setup that we'll use, but, for brevity, these will be omitted in subsequent code samples.

#### HTML Boilerplate

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Motorcycle Collections Tutorial</title>
  <script src="main.js"></script>
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

### Managing child components

Let's start by creating a very simple application and use a collection just to manage some predefined child components. The component examples below are overly simplistic of course, as we're just demonstrating a concept. In reality, sections of functionality would be broken out into separate components only when there is value to managing them independently.

```js
import * as most from 'most';
import {run} from '@cycle/most-run';
import {div, h1, header, main, nav, p, makeDOMDriver} from '@motorcycle/dom';
import Collection from '@motorcycle/collection';

function Header(sources) {
  const view$ = most.just(
    header('.tutorial-header', [
      h1('Component Collections Tutorial')
    ])
  );
  return {
    DOM: view$
  };
}

function Navigation(sources) {
  const view$ = most.just(
    nav('.tutorial-nav', [
      div('Nav goes here.')
    ])
  );
  return {
    DOM: view$
  };
}

function Content(sources) {
  const view$ = most.just(
    main('.tutorial-content', [
      p('Welcome to the tutorial!')
    ])
  );
  return {
    DOM: view$
  };
}

function App(sources) {
  const header = Header(sources);
  const navigation = Navigation(sources);
  const content = Content(sources);

  // Here we'll use a collection in the simplest way possible; by using it to
  // streamline the management of our child components. Note that even though
  // we're setting items by key, the collection retains items the order in which
  // they were added, so you can be sure they'll always be returned in the order
  // you expect.

  const components = Collection()
    .setInstance('header', header)
    .setInstance('nav', navigation)
    .setInstance('content', content);

  // Now that the collection is managing our child components, we can combine
  // the views easily and use them as part of our app view. The `combineObject`
  // static method combines the latest values from the specified sink in each
  // child component and emits an updated object containing key/value pairs of
  // for latest value emitted by each component.

  const view$ = components.combineObject('DOM')
    .map(({header, nav, content}) => div('.container', [header, nav, content]));

  return {
    DOM: view$
  }
}

run(App, {
  DOM: makeDOMDriver('#app')
});
```

Alternatively, rather than using `combineObject`, we could use `combineArray` if we
would prefer the child components to be emitted as an array rather than an
object of key/value pairs, like so:

```js
const view$ = components.combineArray('DOM')
  .map(([header, nav, content]) => div('.container', [header, nav, content]));
```

### Replacing a child component when state changes

Sometimes we want to be able to switch out one component for another depending on the state of our application. A simple example would be changing a login form in the sidebar to a profile picture and account menu if the user is logged in. Obviously this isn't *too* difficult to handle manually, but using a collection can make it a breeze.

This example assumes the existence of an `auth$` source stream. The hypothetical stream emits `{profile: null}` if not logged in, or `{profile: {...}}` otherwise, and uses `@most/hold` to retain the last emitted value so that when the stream is observed by a new component, it'll receive the most recent auth state straight away.

```js
function LoginForm(sources) {
  // ...
  return { DOM: view$ };
}

function AccountControls(sources) {
  // ...
  return { DOM: view$ };
}

function App(sources) {
  const components$ = sources.auth$

    // Filter out values where the login state has not changed. Emitting a value
    // past this point causes the component to be recreated and replaced in the
    // collection. Seeing as the component will itself observe the auth$ source,
    // it will take care of reacting to secondary changes to auth information.
    .skipRepeatsWith((a, b) => !a.profile === !b.profile)

    // Use `scan` to initialize a new collection and keep track of the child
    // component that will be swapped out depending on login state.
    .scan((components, auth) => {
      const account = a.profile ? AccountControls(sources) : LoginForm(sources);
      return components.setInstance('account', account);
    }, Collection())

    // Skip the initial blank collection that `scan` will emit first
    .skip(1);

    // At this point we could perform further operations to append and manage
    // more child components in the list as well. Alternatively or additionally,
    // we could pre-initialize the collection with the components that we know
    // won't be changing externally.

    // ...

    // Because we have a stream of collections, rather than access to the
    // collection itself, we can use the static equivalents of the available
    // 'emit' functions:
    const view$ = Collection
      .combineObject('DOM', components$)
      .map(({accountView}) => render(accountView));

    return {
      DOM: view$
    };
}
```

### Combining multiple sinks from child components

Obviously child components will usually return more than just a DOM stream. HTTP requests and WebSocket messages, to name just a couple, are potential sinks that need to be returned to their respective drivers in order for the child component to function correctly. Use of the static `Collection.merge` method does all the hard work for us.

```js
function App(sources) {
  // Create our child component collection stream
  const components$ = makeChildComponents(sources);

  // Render the app view any time a child component's view changes
  const view$ = Collection.combineObject('DOM', components$)
    .map(render);

  // Merge pass-through sinks from child components into a new sinks object
  const childSinks = Collection.merge(['HTTP', 'socket'], components$);

  // Create a sinks object that is relevant to the local `App` component
  const appSinks = {
    DOM: view$,
    HTTP: emitSomeMoreHTTPRequests(sources) // Illustrative only
  };

  // Finally, merge both sinks object into a new, unified sinks object
  const sinks = Collection.merge(appSinks, childSinks);

  // The final `sinks` object contains: {DOM, HTTP, socket}
  return sinks;
}
```

### Simple merging of a common sink to a derivative stream

As a convenience, the `merge` method can take all child components that contain the specified sink and merge those sinks into a single derivative stream.

```js
const request$ = Collection.merge('HTTP', components$);
```

Or use the equivalent instance method:

```js
const request$ = components.merge('HTTP');
```

### Dynamic lists of child components

Often you'll need to manage variably-sized lists of a common component type, or of several potential component types. A collection can take care of the instantiation of list items automatically.

First, register a component type with the collection:

```js
function MyComponent(sources) {
  // ...
}

const list = Collection(MyComponent);
```

Now we can add, remove and update items in the list. This example is based around managing a dynamic list of people, and assumes the existence of an `action$` stream which emits items of `{action: 'add|remove', person: {id, sources?}}`.

Note that, in most cases, replacing a specific collection item with a new component instance should be an uncommon occurrence, as it's less efficient than simply updating the component via the component's source streams. As such, usually we'll want to pass in a custom `sources` object containing a prepared `props$` stream, and simply emit new `props` objects when a component's properties change.

```js
function updateList(list, {action, person}) {
  switch(action) {
    case 'add': return list.set(person.id, person.sources);
    case 'remove': return list.remove(person.id);
    default: return list;
  }
}

const people$ = action$
  .scan(updateList, Collection(Person))
  .skipRepeatsWith(Collection.isEqual);
```

Notice the static `Collection.isEqual` method we've used above, which checks the underlying immutable data structure for equality so that unnecessary processing can be avoided if nothing has changed. There is also a static `Collection.areItemsEqual` method if you only want to check for changes in the list of child items and ignore changes to the list of component definitions, which would trigger inequality in `Collection.isEqual`.

### Managing lists of components that don't have a key

Sometimes we don't care to manually identify our child components. Instead we just want to build a list by appending items and otherwise letting things manage themselves. This example revolves around a hypothetical simulation of the Chrome developer console. Each log message potentially displays items of data that can be clicked and expanded for further inspection.

To add an item for which we don't have a key, simply use the `add` method, which generates a unique key and then appends the item internally using `set`. Remember, collections use [ordered maps](facebook.github.io/immutable-js/docs/#/OrderedMap) internally, which is why we're able to use keys but still treat the collection like a list.

```js
function ConsoleMessage(sources) { /* ... */ }

const console$ = logMessage$
  .scan((messages, msg) => messages.add(msg), Collection(ConsoleMessage));
```

### Handling multiple component types in a single list

Most of the time, all items in a list will be of a uniform component type, but sometimes we'll want the option to create children of differing types, depending on context. Having support for multiple component types in a single list can also be useful for cases where we're managing a collection of known entities, but, for whatever reason, we'd like the collection to manage the lifecycle of those components rather than requiring us to do so ourselves.

To define additional component types beyond the first, we can either define the set of available component types when the collection is created, or we can define them on an adhoc basis.

To define multiple component types when the collection is instantiated, we pass an options object to the collection. The first item in the `types` list is used by default if no type is specified when adding or setting a new list item.

```js
function ImageItem(sources) { /* ... */ }
function VideoItem(sources) { /* ... */ }
function MessageItem(sources) { /* ... */ }

const emptyList = Collection({
  types: [MessageItem, ImageItem, VideoItem]
});

// Use the name of the function to specify which component type to use:
const videos$ = video$.scan((list, sources) =>
  list.add(VideoItem.name, sources), emptyList);

// Or use the `set` method if you want to specify a key for the item:
const images$ = image$.scan((list, image) =>
  list.set(image.id, ImageItem.name, image.sources));
```

To define another component type after the list has been instantiated, use the `define` method:

```js
function WidgetItem(sources) { /* ... */ }
const updatedList = list.define(WidgetItem);
```

### Taking control of a component's lifecycle within a list

The simplest way to define a component type within a list is to provide a component function, as the examples above demonstrate. You then supply a preconstructed `sources` object which the collection will use when it instantiates the component. Sometimes, however, you need a little more control over how components are instantiated and managed. When defining a component, rather than passing the component function directly, you can provide a component type definition object.

First let's look at how a collection works by default.

When you ask the collection to add a new item, the collection needs to actually instantiate the component first. So this operation:

```js
const newList = list.add(someType, sourcesToUse);
```

... actually results in the following:

**(1)** The collection locates the type definition matching the specified type id. A type definition has the following basic signature. If you only provided a component function when defining the collection, the collection creates a definition for you and fills in the blanks:

```js
type ComponentType: {
  sources?: Sources
  key: ComponentTypeIdentifier
  fn?: ComponentFunction
  instantiate?: (input: Input, type: TypeDefinition, list: ICollection) => Sinks
}
```

All of these can be overridden with custom values as needed.

**(2)** Once it has located the type definition, it calls the type's `instantiate` function, passing in the input you provided (which has always been a `sources` object in the examples up until this point), as well as the type definition and a reference to the collection itself. The default `instantiate` implementation creates a new sources object by merging the item input (if it appears to be a sources object) into the default sources for the type definition (if present) and then merges that into the collection's default sources object (again, if present). This means you can supply default sources at both the collection level and the component type level and then only worry about supplying the additional source streams that are specific to the object, such as a `props$` stream. The default `instantiate` function then calls the component function (the `fn` property of the type definition), passing it the new sources object, and then returns the result.

Overriding the `instantiate` function with your own implementation gives you complete control over how list inputs are handled in the process of instantiating a component. While the default implementation treats inputs as sources, your own implementation can make any assumption it wants, allowing you to provide other types of inputs such as props or just simply pure data.

A custom type definition with your own `instantiate` function might look like so:

```js
function emitVideoProps(video) {
  return most.just(video);
}

const emptyList = Collection({
  types: [{
    key: 'video',
    instantiate: (video, type, list) => {
      const sources = {
        ...list.sources,
        ...type.sources,
        props$: emitVideoProps(video)
      };
      return VideoComponent(sources);
    }
  }]
});

// And then:
const newList = emptyList.add('video', {title: 'To Kill A Mockingbird', year: 1962});
```

Notice that the `fn` property has been omitted, as the custom `instantiate` function calls the component function directly. The reason you normally need to specify the component function when defining a type is because otherwise the `Collection` instance won't know how to create your sinks when you pass it a new input, and the default implementation of the `instantiate` function looks for the `fn` property.

Naturally you could also do the equivalent of the above example, but via the `define` function.

## API Reference

- [API Specification](#api-specification) - a cheat sheet showing all type interfaces and function signatures
- [Types Reference](#types-reference) - detailed documentation for the types and functions listed below

### API Specification

#### Implied Types

Note that the `Map` type referenced further below refers to the native [ES2015 Map](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Map) type. `ListOptions`, `ComponentType`, and  `ComponentInstance` are defined further below.

```js
type Key: String
type KeyValueMap<A>: { [key: Key]: A, ... }
type Stream: most.Stream
type Sources: KeyValueMap<any>
type Sinks: KeyValueMap<Stream>
type Component: (Sources) => Sinks
type Identifier: String|Number
type ComponentTypeIdentifier: Identifier
type InstanceIdentifier: Identifier
type ComponentDefinition: Component|ComponentType
type Input: Sources|any
```

#### Collection API

```js
// # CONSTRUCTION

// New collection, optionally with a default component type, or specify further options
Collection: () => ICollection
Collection: (fn: ComponentFunction) => ICollection
Collection: (type: ComponentTypeIdentifier, fn: ComponentFunction) => ICollection
Collection: (options: ComponentDefinition) => ICollection
Collection: (options: ListOptions) => ICollection

// # STATIC METHODS FOR MANAGING LIST STREAMS

// Check if a value is an ICollection instance
Collection.isCollection: (arg: any) => Boolean

// Merge the specified sink from each collection item into a single resultant stream
Collection.merge: (key: Key, list$: Stream<ICollection>) => Stream

// Merge each of the specified sinks in each collection item into a single unified sinks object
Collection.merge: ([key: Key, ...], list$: Stream<ICollection>) => Sinks

// Merge the streams from each of two or more sinks objects into a single unified sinks object
Collection.merge: (a: Sinks, b: Sinks, ... n: Sinks) => Sinks

// Similar behaviour to that of most.combineArray, with input streams taken by mapping the specified
// sink key from each component in the collection.
Collection.combineArray: (key: Key, list$: Stream<ICollection>) => Stream<Array<any>>
Collection.combineArray: (keys: Key[], list$: Stream<ICollection>) => Stream<Array<KeyValueMap<any>>>

// As above, but emits a native `Map` instead of a plain object
Collection.combineObject: (key: Key, list$: Stream<ICollection>) => Stream<KeyValueMap<any>>
Collection.combineObject: (keys: Key[], list$: Stream<ICollection>) => Stream<KeyValueMap<KeyValueMap<any>>>

// Equality comparison
Collection.isEqual: (a: ICollection, b: ICollection) => Boolean
Collection.areItemsEqual: (a: ICollection, b: ICollection) => Boolean

// # COLLECTION INSTANCE TYPES AND METHODS

type ICollection: {
  // Most overloads for the `collection` function are aliases for the `define` method
  define: (fn: ComponentFunction) => ICollection
  define: (type: ComponentTypeIdentifier, fn: ComponentFunction) => ICollection
  define: (type: ComponentTypeIdentifier, options: ComponentDefinition) => ICollection
  define: (options: ComponentDefinition) => ICollection

  // Append an instance of either the default or a specified component type`
  add: (input?: Input) => ICollection
  add: (type: ComponentTypeIdentifier, input: Input) => ICollection
  addInstance: (type?: ComponentTypeIdentifier, instance: Sinks) => ICollection

  // Set a keyed instance of either the default or a specified component type
  set: (key: InstanceIdentifier, type?: ComponentTypeIdentifier, input: Input) => ICollection
  setAt: (index: Number, type?: ComponentTypeIdentifier, input: Input) => ICollection
  setInstance: (key: InstanceIdentifier, type?: ComponentTypeIdentifier, instance: Sinks) => ICollection
  setInstanceAt: (index: Number, type?: ComponentTypeIdentifier, instance: Sinks) => ICollection

  get: (key: InstanceIdentifier) => ComponentInstance
  getAt: (index: Number) => ComponentInstance

  // Remove a component by key or index
  remove: (key: InstanceIdentifier) => ICollection
  removeAt: (index: Number) => ICollection

  // Remove all items from the collection
  clear: () => ICollection

  // The number of elements in the list
  size: Number

  // Collection-specific versions of the same-named static methods
  merge: (key: Key) => Stream
  merge: (keys: Key[]) => Sinks
  combineArray: (key: Key) => Stream<Array<any>>
  combineArray: (keys: Key[]) => Stream<Array<KeyValueMap<any>>>
  combineObject: (key: Key) => Stream<KeyValueMap<any>>
  combineObject: (keys: Key[]) => Stream<KeyValueMap<KeyValueMap<any>>>
}

// A list can be initialized with predefined types and custom behaviour
type ListOptions: {
  sources?: Sources
  types?: [ComponentDefinition, ...]
}

// A component type can be defined with optional custom behaviour per type
type ComponentType: {
  sources?: Sources
  key: ComponentTypeIdentifier
  fn?: ComponentFunction
  instantiate?: (input: Input, type: TypeDefinition, list: ICollection) => Sinks
}

// The following values are retained for each active component instance in the collection:
type ComponentInstance: {
  key: InstanceIdentifier
  type: ComponentTypeIdentifier
  input: Input
  sinks: Sinks
}
```

## Types Reference

This section is yet to be completed.

<!-- Notes to be included in documentation:

- Collection.combineX methods:
  - Only emits when all composed streams have emitted at least one value
  - Multi-key projections as above; all must emit a value before a resultant emission can occur
  - When the list changes, the above conditions for emission still apply
  - When data is received, state becomes `pending`
  - When a combined emission takes place, state is no longer `pending`
  - if an item is removed and all remaining streams have emitted an item, `pending` state triggers an emission
  - If a combined emission is desired even when a subset of streams have not yet emitted data, use `Collection.merge()` -->
