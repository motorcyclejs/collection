# Most.js Collections for Cycle.js

**Status: In Development - Coming Soon**

<!-- [![Build Status](https://travis-ci.org/motorcyclejs/collection.svg?branch=master)](https://travis-ci.org/motorcyclejs/collection) -->
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/cyclejs/core)

This is a library to make management of collections of child components much easier, and was inspired by [Nick Johnstone](https://github.com/Widdershin)'s excellent [collection](https://github.com/cyclejs/collection) library for [Cycle.js](http://cycle.js.org/) and [xstream](https://github.com/staltz/xstream). It's based on [Most.js](https://github.com/cujojs/most) streams (as are all Motorcycle packages) and while it shares some similarities with [cycle/collection](https://github.com/cyclejs/collection), it was written from scratch with the idea that management of a static set of child components is a problem close enough to that of dynamic lists of child components that a unified API could handle both problems.

### Features

- **Immutable** by default; perfect for managing using `scan`, `loop`, `map` and others.
- Define an arbitrary number of component types that the list will support
- Add, update and remove any number of children of any of the component types defined for the collection
- Collection size grows and shrinks dynamically
- Manage as a dynamic array of components for cases such as lists, or set children by key to streamline the management of different predefined sections of a page
- Merge children into unified groups of arbitrary sinks that the parent component can return directly or merge with its own local streams
- Automatically project a common sink from each child to an array of the most recent values from each child component; ideal for use with `map`, `combine` and `combineArray`
- Supports _clice_, _skip_, _take_, _orderBy_ and _filter_ to transform the list and efficiently handle rendering, paging and filtering of very large collections and to make it possible to prevent unnecessary processing of offscreen list items
- Customizable lifecycle operations for each defined component type, including instantiation, equality and sort comparison operations
- Automatic provision of an additional source stream to each child component so that the component has access to item-specific list metadata, such as the list size, the index of the item in the list and so forth

Stay tuned.
