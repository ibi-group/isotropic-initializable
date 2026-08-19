# Changelog

## 0.13.1 - 2026-07-24

### Fixed

**A `_initialize` method inherited at more than one level now runs at its deepest position in the chain, not its shallowest.**

When the same `_initialize` function is reachable from several objects in the inheritance graph, which happens whenever a mixin defining `_initialize` is applied at more than one level, or the same mixin is shared by a class and its superclass, the method must run exactly once, at the correct point in the ordering.

The de-duplication previously tracked only which methods had been seen, and kept the *first* object encountered. Because the chain is walked from the instance outward and each object is prepended, keeping the first-seen object placed the method at its shallowest position, so it ran later than it should have relative to the other initializers.

The implementation now maps each method to the object that contributed it, and when the same method is seen again, removes the earlier entry before inserting the new one. The method therefore runs at its deepest position, which is the ordering the rest of the initialization sequence assumes.

If you have a mixin that defines `_initialize` and is applied at multiple levels, the order in which your initializers run relative to one another will change to the intended order with this release.

### Changed

Minor internal cleanup.

## 0.13.0 - 2026-07-15

### Breaking changes

**Initialization callbacks no longer fire on a destroyed instance.** If an instance is destroyed while an asynchronous `_initialize` method is still pending, the `initializeComplete` and `initializeError` events are no longer published, and `_initialized` is no longer set. Previously a late-settling initializer could publish events on, and mutate the state of, an object that had already been torn down.

This closes a class of use-after-destroy bugs. If you were relying on `initializeComplete` firing regardless of destruction, that no longer happens.

**The constructor is now named `Initializable`,** via `isotropic-make`'s new name parameter, so `Initializable.name` is `'Initializable'` rather than the empty string and instances carry a matching `Symbol.toStringTag`.

**The package now ships source directly instead of a Babel build.** Source moved from `js/` to `lib/`.

#### Migration

For most consumers this is a Node version bump. Review any code that assumed `initializeComplete` or `initializeError` would fire even after `destroy()`.

### Changed

- Error reporting on initialization failure was extracted into an overridable `_initializeError` method, so a subclass can intercept the failure rather than letting it be rethrown asynchronously.
- `description` rewritten and `keywords` expanded.
- Recommends `node ^26.5.0` / `npm ^11.17.0`.

### Internal

- Test suite migrated from Mocha to the built-in `node --test` runner; the Babel toolchain and build scripts were removed.
- `isotropic-dev-dependencies` updated to `~0.4.0`; all Isotropic dependencies bumped to their 2026 releases.

## 0.12.0 - 2025-06-18

### Changed

Dependency bumps only. No source changes.

## 0.11.0 - 2025-04-10

### Breaking changes

**Event declarations migrated from `defaultFunction` to `completeFunction`,** following the `isotropic-pubsub` 0.15.0 event-stage rework. The `initialize`, `initializeComplete`, and `initializeError` events now register their handlers as complete-stage functions.

**Updated for the `isotropic-mixin-prototype-chain` 0.11.0 export change** The three named exports became a single default export object. `isotropic-initializable` 0.11.0 therefore requires `isotropic-mixin-prototype-chain` `~0.11.0` and `isotropic-pubsub` `~0.15.0`. The three must be upgraded together.

**The `Dispatcher` import moved** from a named export of `isotropic-pubsub` to a deep import of `isotropic-pubsub/lib/dispatcher.js`.

### Changed

- A comprehensive README was added.
- `eslint` pinned at `~9.8.0` as a direct dev dependency.
- `isotropic-dev-dependencies` bumped to `~0.3.1`.

## 0.10.0 - 2024-07-30

### Breaking changes

**The pubsub configuration property was renamed from `_events` to `_pubsub`,** following the corresponding rename in `isotropic-pubsub`. Subclasses that declare events by defining an `_events` object must rename it:

```javascript
// Before
_events: {
    myEvent: { /* ... */ }
}

// After
_pubsub: {
    myEvent: { /* ... */ }
}
```

**The package is now an ES module.** `"type": "module"` was added to `package.json`. CommonJS consumers can no longer `require('isotropic-initializable')`.

#### Migration

Switch to `import`, and rename `_events` to `_pubsub` in every subclass and mixin:

```javascript
// Before
const _Initializable = require('isotropic-initializable');

// After
import _Initializable from 'isotropic-initializable';
```

### Changed

- Own-property checks migrated from `Reflect.apply(Object.prototype.hasOwnProperty, …)` to `Object.hasOwn`.
- ESLint moved to flat config.
- Coverage tooling switched from `nyc` to `c8`.
- `repository` given an explicit `github:` prefix.
- Recommends `node ^22.5.1` / `npm ^10.8.2`.

## 0.9.0 - 2021-02-22

### Changed

- The entire dev toolchain was replaced by a single `isotropic-dev-dependencies` dev dependency.
- Recommends `node ^14.15.5` / `npm ^7.5.4`.

No runtime behavior changed in this release.

## 0.8.0 - 2020-07-27

### Changed

- A `files` allowlist was added so only `lib` is published.
- `.npmignore` was removed.
- Dependency refresh: ESLint 7, Mocha 8, nyc 15, Babel 7.10.
- Recommends `node ^12.18.3` / `npm ^6.14.6`.

No runtime behavior changed in this release.

## 0.7.0 - 2019-05-10

### Changed

Added the `isotropic` keyword to `package.json`.
Lint cleanup.
Dependency bumps.

No runtime behavior changed in this release.

## 0.6.2 - 2019-05-08

### Changed

Dependency bumps only.

## 0.6.0 - 2019-05-08

### Changed

- Dev dependency refresh (Babel 7.4, Mocha 6, nyc 14, ESLint 5.16).
- Recommends `node ^10.15.3` / `npm ^6.4.1`.

No runtime behavior changed in this release.

## 0.5.0 - 2019-02-18

### Changed

- Dev dependency refresh.
- Recommends `node ^10.15.1` / `npm ^6.4.1`.

No runtime behavior changed in this release.

## 0.4.0 - 2018-11-25

### Changed

- Migrated from Babel 6 to Babel 7, and from `babel-istanbul` to `nyc` for coverage.
- Dropped the `nsp` security check.
- Recommends `node ^10.13.0` / `npm ^6.4.1`.

No runtime behavior changed in this release.

## 0.3.0 - 2017-09-12

### Breaking changes

**The `isotropic-asap` dependency was replaced by `isotropic-later`,** and `babel-runtime` was removed. `isotropic-error` was added.

### Changed

- ESLint configuration moved to the `plugin:isotropic/isotropic` shared config.
- Recommends `node ^8.4.0` / `npm ^5.4.1`.

## 0.2.0 - 2017-02-05

### Changed

- Dependency bumps.
- Recommends `node ^6.9.5` / `npm ^4.1.2`.

No runtime behavior changed in this release.

## 0.1.0 - 2017-01-08

Initial release.

- Default export is a base constructor, built with `isotropic-make` on top of `isotropic-pubsub`, that turns object construction into an observable, potentially asynchronous lifecycle.
- Calling `initialize(...)` publishes an `initialize` event. The default action runs every `_initialize` method found in the inheritance graph, in order from the base of the chain toward the instance.
- An `_initialize` method may return a promise, in which case the sequence awaits it before continuing, so initialization can be asynchronous while remaining ordered.
- On success an `initializeComplete` event is published and `initialized` becomes `true`.
- On failure an `initializeError` event is published carrying an `isotropic-error` wrapping the cause.
- Each distinct `_initialize` method runs once even when reachable through several paths in the graph, and a class can suppress inherited initializers by listing them in `_doNotInitialize`.
- Mixin-provided `_initialize` methods participate, via `isotropic-mixin-prototype-chain`.
- Depends on `isotropic-asap`, `isotropic-make`, `isotropic-mixin-prototype-chain`, `isotropic-pubsub`, and `babel-runtime`.
- Recommends `node ^6.9.4` / `npm ^4.1.1`.
