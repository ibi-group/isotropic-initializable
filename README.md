# isotropic-initializable

[![npm version](https://img.shields.io/npm/v/isotropic-initializable.svg)](https://www.npmjs.com/package/isotropic-initializable)
[![License](https://img.shields.io/npm/l/isotropic-initializable.svg)](https://github.com/ibi-group/isotropic-initializable/blob/main/LICENSE)
![](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)

An observable initialization lifecycle for JavaScript objects. Ensures parent-to-child initialization sequence, supports asynchronous initialization, and provides event-based completion notifications.

## Why Use This?

- **Predictable Initialization Order**: Ensures parent class initialization completes before child classes initialize
- **Asynchronous Support**: Works with both synchronous and promise-based initialization methods
- **Observable Lifecycle Events**: Subscribe to initialization events for greater control
- **Awaitable**: `await` an instance's initialization instead of nesting the rest of your code in a callback function, with failures raised as rejections
- **Mixin Support**: Works seamlessly with `isotropic-make` mixins
- **Selective Initialization**: Configure which classes in the hierarchy should initialize
- **Error Handling**: Built-in error propagation for initialization failures

## The Initialization Problem

When using hierarchical inheritance in JavaScript, the standard pattern with `isotropic-make` (or ES6 classes) runs constructors from parent to child, but then instance methods run in reverse order (child to parent). For complex objects that need a reliable initialization sequence, this can be problematic.

The `isotropic-initializable` module solves this by providing a dedicated initialization phase that runs in a predictable parent-to-child order, ensuring each component has a stable foundation to build upon.

## Installation

```bash
npm install isotropic-initializable
```

## Basic Usage

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

// Create a base component with initialization
const _BaseComponent = _make('BaseComponent', _Initializable, {
        _initialize () {
            console.log('Base component initializing...');

            this.baseReady = true;

            // Can return a Promise if needed
        }
    }),
    // Create a derived component
    _EnhancedComponent = _make('EnhancedComponent', _BaseComponent, {
        _initialize () {
            console.log('Enhanced component initializing...');

            // Safe to use this.baseReady here, parent initialization completes first

            this.enhancedReady = true;
        }
    });

{
    // Instance is automatically initialized during construction
    const component = _EnhancedComponent();
    // Outputs:
    // Base component initializing...
    // Enhanced component initializing...

    console.log(component.initialized); // true
}
```

## Key Concepts

### Initialization Order

1. The `isotropic-initializable` module ensures initialization methods are called in parent-to-child order
2. For each class in the inheritance chain, its `_initialize` method is called
3. Mixins are initialized in the order they were defined
4. Any asynchronous initialization is properly awaited before proceeding to child classes

### Observable Lifecycle

The initialization process includes several observable events:

1. **initialize**: Triggered when initialization begins
2. **initializeComplete**: Triggered when all initialization has completed successfully
3. **initializeError**: Triggered if an error occurs during initialization

```javascript
const component = _Component({
    initialize: false
});

// Listen for complete initialization
component.on('initializeComplete', () => {
    console.log('Component is fully initialized!');
});

// Listen for initialization errors
component.on('initializeError', ({
    data
}) => {
    console.error('Initialization failed:', data.error);
});

// Start initialization
component.initialize();
```

### Awaiting Initialization

The `untilInitialized()` method returns a promise that settles with the outcome of initialization. It resolves with the `initializeComplete` [event snapshot](https://github.com/ibi-group/isotropic-pubsub#event-snapshot) when initialization succeeds, and rejects when it fails:

```javascript
const component = _Component();

await component.untilInitialized();

// The instance is fully initialized here
```

This is usually what you want instead of an `initializeComplete` subscription. The work that depends on initialization stays in the enclosing function rather than moving into a callback function, and it composes with everything else you `await`.

Under the hood it calls the inherited `until` method with both lifecycle events configured, so it is equivalent to writing this yourself:

```javascript
await component.until({
    eventName: 'initializeComplete',
    reject: [
        'destroyComplete',
        'initializeError'
    ],
    subject: 'Initialization'
});
```

#### It Works Whether Or Not Initialization Has Already Completed

The `initializeComplete` and `initializeError` events are declared `publishOnce`. Subscribing to a `publishOnce` event that has already been published executes the subscription immediately, so the promise settles even when you are late:

```javascript
const component = _Component();

// Synchronous initialization has already finished by this point
console.log(component.initialized); // true

// Resolves anyway
await component.untilInitialized();
```

That property is what makes awaiting initialization reliable. You never have to know whether a given instance initializes synchronously or asynchronously, and you never have to win a race against it. The same call is correct in both cases, and it stays correct if a subclass later makes its `_initialize` method asynchronous.

#### Awaiting An Initialization That Might Fail

When initialization fails, the promise rejects with an `isotropic-error` named `RejectError`, so an ordinary `try`/`catch` handles both outcomes:

```javascript
try {
    await component.untilInitialized();
} catch (error) {
    // error.name is 'RejectError'
    // error.details.eventSnapshot.data.error is the wrapped 'Initialize error'
    // error.details.eventSnapshot.data.error.error is what _initialize actually threw
    console.error(error.details.eventSnapshot.data.error);
}
```

#### Timeouts And Cancellation

An `untilInitialized` subscription is a cancelable task, so a promise waiting on initialization accepts the same cancellation options as any other isotropic cancelable task, and the returned promise carries `cancel`, `unsubscribe`, and `Symbol.dispose`:

```javascript
try {
    await component.untilInitialized({
        timeout: 5000
    });
} catch (error) {
    // Error: Initialization timed out
}
```

The promise returned by `untilInitialized()` carries the same `cancel`, `unsubscribe`, and `Symbol.dispose` members, so it can be released the same way.

#### Destruction During Initialization

If an instance is destroyed while asynchronous initialization is still pending, neither `initializeComplete` nor `initializeError` is published but `destroyComplete` is published and rejects the promise.

For an instance that can be destroyed out from under you, the event snapshot's name will tell you whether it was rejected due to a `destroyComplete` event or an `initializeError` event:

```javascript
try {
    await component.untilInitialized();
} catch (error) {
    if (error.details.eventSnapshot.name === 'destroyComplete') {
        // Destroyed before initialization finished
    }
}
```

#### Awaiting Initialization To Begin

Deferred instances publish `initialize` when initialization starts, and it can be awaited like any other event. The snapshot's `data.args` holds the arguments initialization was started with:

```javascript
const component = _Component({
        initialize: false
    }),
    eventSnapshot = await component.until('initialize');

console.log('Initializing with:', eventSnapshot.data.args);
```

### Initialization Status

Three Boolean getters report where an instance is in its lifecycle:

```javascript
const component = _Component();

console.log(component.initialized); // Initialization completed successfully
console.log(component.initializeFailed); // Initialization failed
console.log(component.initializing); // Initialization is in progress
```

At most one of them is ever `true`. All three are `false` when initialization has not begun, which is the state of an instance constructed with `initialize: false` that has not been initialized yet, or any instance whose `initialize` event was prevented. An instance becomes `initializing` when the `initialize` event reaches its complete stage. All three are `undefined` once the instance has been destroyed.

| | `initialized` | `initializeFailed` | `initializing` |
| --- | --- | --- | --- |
| Not begun | `false` | `false` | `false` |
| In progress | `false` | `false` | `true` |
| Succeeded | `true` | `false` | `false` |
| Failed | `false` | `true` | `false` |
| Destroyed | `undefined` | `undefined` | `undefined` |

## Examples

### Basic Synchronous Initialization

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

const _Widget = _make('Widget', _Initializable, {
    render () {
        document.body.appendChild(this.elements.container);
    },
    _initialize (config) {
        console.log('Initializing widget with:', config);

        this.elements = {};
        this.name = config.name;


        // Create DOM elements
        this.elements.container = document.createElement('div');
        this.elements.container.className = 'widget';
    }
});

{
    // Create and initialize
    const widget = _Widget({
        name: 'MyWidget'
    });

    // Already initialized
    widget.render();
}
```

### Asynchronous Initialization

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

const _DataComponent = _make('DataComponent', _Initializable, {
    displayData () {
        console.log('Displaying:', this.data);
    },
    async _initialize (config) {
        console.log('Loading data...');

        // API call
        this.data = await fetch(`https://api.example.com/data/${config.id}`).then(response => response.json());

        console.log('Data loaded!');
    }
});

{
    // Create and automatically initialize
    const component = _DataComponent({
        id: '123'
    });

    // Wait for completion
    await component.untilInitialized();

    component.displayData();
}
```

A subscription works too, and is the better choice when the completion handling belongs to the component rather than to the code that constructed it:

```javascript
{
    const component = _DataComponent({
        id: '123'
    });

    component.on('initializeComplete', () => {
        component.displayData();
    });
}
```

### Delayed Initialization

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

const _LazyComponent = _make('LazyComponent', _Initializable, {
    _initialize() {
        console.log('Initializing expensive resources...');

        // Do expensive initialization
    }
});

{
    // Create without initializing
    const component = _LazyComponent({
        initialize: false
    });

    console.log(component.initialized); // false

    // Listen for completion
    component.on('initializeComplete', () => {
        console.log('Now ready to use!');
    });

    // Later, when needed
    button.addEventListener('click', () => {
        component.initialize();
    });
}
```

### Multi-level Inheritance

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

// Base component
const _UiComponent = _make('UiComponent', _Initializable, {
        _initialize (config) {
            console.log('UiComponent initializing');

            this.id = config.id || `ui-${Date.now()}`;
            this.element = document.createElement('div');
            this.element.id = this.id;
        }
    }),
    // Mid-level component
    _Container = _make('Container', _UiComponent, {
        _initialize (config) {
            console.log('Container initializing');

            this.children = [];
            this.element.className = 'container';

            if (config.styles) {
                Object.assign(this.element.style, config.styles);
            }
        }
    }),
    // Leaf component
    _Panel = _make('Panel', _Container, {
        addContent (content) {
            this.content.appendChild(content);

            return this;
        },
        _initialize (config) {
            console.log('Panel initializing');

            // Create header
            this.header = document.createElement('header');
            this.header.textContent = config.title || 'Untitled Panel';
            this.element.appendChild(this.header);

            // Create content area
            this.content = document.createElement('div');
            this.content.className = 'panel-content';
            this.element.appendChild(this.content);
        }
    });

{
    // Create instance - initialization runs in order:
    // 1. _UiComponent._initialize
    // 2. _Container._initialize
    // 3. _Panel._initialize
    const panel = _Panel({
        id: 'main-panel',
        styles: {
            height: '300px',
            width: '500px'
        },
        title: 'System Status'
    });

    document.body.appendChild(panel.element);
}
```

### Using with Mixins

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

// Create mixins
const _Resizable = _make('Resizable', {
        resize (width, height) {
            this.width = width ?? this.width;
            this.height = height ?? this.height;
            this.updateSize();
        },
        updateSize () {
            console.log(`Setting size: ${this.width}x${this.height}`);

            // Update size
        },
        _initialize (config) {
            console.log('Initializing resize support');

            this.height = config.height ?? 200;
            this.width = config.width ?? 300;

            this.updateSize();
        }
    }),
    _Themeable = _make('Themeable', {
        applyTheme (theme) {
            console.log(`Applying theme: ${theme}`);

            // Apply theme styles
        },
        toggleTheme () {
            this.theme = this.theme === 'light' ?
                'dark' :
                'light';
            this.applyTheme(this.theme);
        },
        _initialize (config) {
            console.log('Initializing theme support');

            this.theme = config.theme ?? 'light';
            this.applyTheme(this.theme);
        }
    }),

    // Create a component with mixins
    _MyComponent = _make('MyComponent', _Initializable, [
        _Resizable,
        _Themeable
    ], {
        _initialize (config) {
            console.log('Initializing my component');

            this.title = config.title ?? 'Untitled';
            // Component-specific initialization
        }
    });

{
    // Create instance
    const component = _MyComponent({
        height: 600,
        theme: 'dark',
        title: 'Dashboard',
        width: 800
    });

    // Mixins are initialized in order:
    // 1. _Resizable._initialize
    // 2. _Themeable._initialize
    // 3. _MyComponent._initialize
}
```

### Error Handling During Initialization

```javascript
import _Error from 'isotropic-error';
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

const _RiskyComponent = _make('RiskyComponent', _Initializable, {
    async _initialize (config) {
        if (!config.apiKey) {
            throw _Error({
                message: 'API key is required',
                name: 'ConfigurationError'
            });
        }

        // Attempt to connect
        const response = await fetch('https://api.example.com/connect', {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`
            }
        });

        if (!response.ok) {
            throw _Error({
                details: await response.json(),
                message: `API returned ${response.status}`,
                name: 'ConnectionError'
            });
        }

        this.connection = await response.json();
    },
    _initializeError (error) {
        // This method gets executed if initialization fails. Because this class
        // can fail to initialize, it is responsible for implementing it.
        console.error('Initialization failed:', error);
    }
});

{
    const component = _RiskyComponent({
        // Missing apiKey
    });
}
```

See [Initialization Error Handling](#initialization-error-handling) for why implementing `_initializeError` is a requirement rather than an option.

### An Asynchronous Factory Function

A constructor cannot return a promise, so an instance with asynchronous initialization is always constructed before it is ready. Awaiting the lifecycle events lets you wrap that behind a factory function that hands back only fully initialized instances, and reports failures the way the rest of your asynchronous code reports them.

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

const _Connection = _make('Connection', _Initializable, {
    query (sql) {
        return this.client.query(sql);
    },
    _destroy (...args) {
        this.client?.close();

        return Reflect.apply(_Initializable.prototype._destroy, this, args);
    },
    async _initialize (config) {
        this.client = await connect(config.url);
    },
    _initializeError () {
        // Handled here so the base assertion does not fire. This class is
        // only ever constructed by _createConnection below, which awaits
        // the outcome and reports the failure to its caller.
    }
}, {
    async create (config) {
        const connection = this(config);

        try {
            await connection.untilInitialized();
        } catch (error) {
            connection.destroy();

            throw error.details.eventSnapshot.data.error;
        }

        return connection;
    }
});

{
    // Either a usable connection or a thrown error, never a half-built object
    const connection = await _Connection.create({
        url: 'postgres://localhost/app'
    });

    await connection.query('select 1');

    connection.destroy();
}
```

### Selective Initialization

Sometimes you may want to skip initialization of certain parent classes or mixins:

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

const _Logger = _make('Logger', {
        log (message) {
            this.logs.push(`[${new Date().toISOString()}] ${message}`);

            console.log(message);
        },
        _initialize() {
            console.log('Logger initializing');
            this.logs = [];
        }
    }),
    _Storage = _make('Storage', {
        load (key) {
            return this.data[key];
        },
        save (key, value) {
            this.data[key] = value;
        },
        _initialize () {
            console.log('Storage initializing');

            this.data = {};
        }
    }),

    // Component that uses _Logger and _Storage, but doesn't want
    // to initialize _Storage (maybe to use a custom implementation)
    _MyComponent = _make('MyComponent', _Initializable, [
        _Logger,
        _Storage
    ], {
        // Override storage methods
        load (key) {
            this.log(`Loading ${key}`);

            return this.data.get(key);
        },
        save (key, value) {
            this.log(`Saving ${key}`);

            this.data.set(key, value);
        },
        // Skip initialization of Storage
        _doNotInitialize: _Storage,
        // _doNotInitialize could also be an Array or a Set
        _initialize () {
            console.log('MyComponent initializing');

            // Custom storage implementation
            this.data = new Map();
        }
    });

{
    // Create instance
    const component = _MyComponent();

    // Only _Logger and _MyComponent will initialize, _Storage will be skipped
}
```

## Initialization Error Handling

Initialization failure is the one part of the lifecycle a base class cannot decide for you. `isotropic-initializable` has no idea what a subclass does in its `_initialize` method, so it has no idea what a failure means or what the appropriate response is. Retry? Fall back to a default? Log and continue degraded? Tear the instance down? Only the class that defined the initialization behavior knows. So rather than guess, `isotropic-initializable` routes every failure to a designated place and requires the subclass to fill it in.

### The Mechanism

When an `_initialize` method throws or rejects, the error is wrapped in an `isotropic-error` and published as the `initializeError` event.

That event is an ordinary event with the full `before`, `on`, `complete`, `after` lifecycle. Observers subscribed to the stages before `complete` see the error first and may call `prevent()` to stop the event from completing. If the event does complete, its complete stage calls `_initializeError(error)`.

`_initializeError` is the designated place for a class to handle its own initialization failures. **If it is possible for your initialization to fail, implement `_initializeError`.**

```javascript
const _Component = _make('Component', _Initializable, {
    async _initialize (config) {
        this.connection = await connect(config.url);
    },
    _initializeError (error) {
        // This class knows what its own failure means, so it decides here
        this.connection = null;
        this.degraded = true;

        _logger.error({
            error
        }, 'Component initialization failed; running degraded');
    }
});
```

### Why The Base Method Throws

The base `_initializeError` is not a fallback. It is an assertion, and it is never intended to run.

Reaching it means initialization failed and nothing in the class hierarchy, and no observer, took responsibility for the failure. The worst possible response would be to swallow the error, leaving a half-built instance in circulation with no indication that anything went wrong. So the base method rethrows asynchronously, via `isotropic-later`, in a way that is deliberately difficult to suppress: the throw does not happen inside any promise chain or `try` block belonging to the code that triggered initialization, so it cannot be accidentally caught and discarded. It surfaces as an uncaught exception, which is what an unhandled programming error should look like.

If you see `Error: Initialize error` reach your process's uncaught exception handler, that is "usually" the library telling you a class with fallible initialization is missing an `_initializeError` implementation. The fix is to implement it, not to catch the rethrow.

### When Crashing Is The Right Answer

"Usually", but not always. The base method is an assertion aimed at classes that never considered failure. It is not an accusation against a class that considered it and chose the crash.

Some initialization failures mean the instance cannot do its job at all, and never will. The process was started in the wrong kind of environment, a required capability is absent, mandatory configuration is missing. There is nothing to retry, no degraded mode worth running in, and no way for the condition to change while the process lives. Continuing would leave something alive that can only pretend to work. For a class like that, an uncaught exception that is deliberately difficult to suppress is not a missing implementation. It *is* the implementation, and declining to write an `_initializeError` method is a deliberate design decision.

The trouble is that the two situations look identical from the outside. Both are a class with fallible initialization and no `_initializeError` method. So say which one it is, in a comment or in the class's own documentation, or the next person to read the code may attempt to "fix" it:

```javascript
const _DragonDentist = _make('DragonDentist', _Initializable, {
    _initialize ({
        patient
    }) {
        if (patient.species === 'gryphon') {
            // This class intentionally has no _initializeError method.
            // A gryphon is not a dragon. There is no degraded "close enough"
            // mode for scaling tartar off a creature that can also fly and
            // breathe lightning. The base method's uncaught exception is the
            // correct handling.
            throw _Error({
                details: {
                    species: patient.species
                },
                message: `Cannot initialize DragonDentist with a non-dragon patient`
            });
        }
        // ...
    }
});
```

Two things remain true when a class makes this choice:

- **Observers can still intervene.** The failure is published as the `initializeError` event before `_initializeError` runs, so a subscriber at the `before` or `on` stage can call `prevent()` and stop it from completing. Tests commonly use this to assert that a failure happened without taking the process down with it.
- **A subclass inherits the crash and can take it over.** There is one error channel for the entire chain, so a subclass that implements `_initializeError` is handling the base class's failures too, not just its own. If some of those still warrant a crash, the subclass's implementation should recognize the failures it knows how to handle and rethrow the rest.

### Where To Handle It

There are three places a failure can be handled, in the order they run:

1. **An observer subscribed to `initializeError`.** Subscribers at the `before` and `on` stages run first and may call `prevent()` to stop the event before it completes, which suppresses `_initializeError` entirely. Use this when handling belongs to whatever is watching the instance rather than to the class itself.
2. **`_initializeError(error)`, the complete stage.** The normal answer. This is the class taking responsibility for its own failure modes.
3. **`_eventInitializeError(event)`, the complete stage function.** Overriding this replaces the dispatch machinery that calls `_initializeError`, so the method no longer runs unless your override calls it. Reach for it only when you need the event object rather than the error.

Note that preventing the complete stage also prevents the `after` stage, so a promise from `until('initializeError')` at its default `after` stage will not resolve for an event an observer prevented.

### Errors Are Retained For Late Arrivals

`initializeError` is declared `publishOnce`, so the failure is not a moment you can miss. Code that subscribes, or awaits, after the failure has already been published is executed immediately with the original event. There is no window in which an instance has failed but the failure is undiscoverable, and there is no need for the instance to keep a separate reference to the error.

```javascript
// Executes immediately if initialization has already failed
component.on('initializeError', ({
    data: {
        error
    }
}) => {
    console.error(error);
});
```

### The Shape Of The Error

The `initializeError` event's `data.error` is an `isotropic-error` with the message `'Initialize error'`. Its `error` property is the original error thrown by the `_initialize` method. The same wrapped error is the argument passed to `_initializeError`.

```javascript
_initializeError (error) {
    console.log(error.message); // 'Initialize error'
    console.log(error.error); // The error your _initialize method threw
}
```

## Advanced: Completing the Lifecycle

The full lifecycle of an Initializable instance includes:

1. Construction (`_init` in isotropic-make)
2. Initialization (`_initialize` methods)
3. Initialization complete event
4. Usage
5. Destruction (`destroy` method)

It's not always necessary to destroy an instance. If there isn't anything that requires explicit cleanup, the garbage collector will take care of it.

If an instance is destroyed while asynchronous initialization is still in progress, the pending initialization is abandoned: neither `initializeComplete` nor `initializeError` is published, the instance is left uninitialized. (`initialized` is `undefined` after destruction)

```javascript
import _Initializable from 'isotropic-initializable';
import _make from 'isotropic-make';

const _Resource = _make('Resource', _Initializable, {
    use () {
        console.log(`Using resource: ${this.name}`);

        // Use the resource
    },
    _destroy (...args) {
        console.log(`Cleaning up resource: ${this.name}`);

        closeResource(this.handle);

        // Call parent destroy method
        return Reflect.apply(_Initializable.prototype._destroy, this, args);
    },
    _init (...args) {
        Reflect.apply(_Initializable.prototype._init, this, args);

        console.log('Resource constructed');

        return this;
    },
    _initialize (config) {
        console.log('Resource initializing');

        this.name = config.name;
        this.handle = openResource(this.name);
    },
    _initializeComplete (config) {
        console.log('Resource initialization complete');
    }
});

{
    // Create with automatic initialization
    const resource = _Resource({
        name: 'database'
    });

    // Use the resource
    resource.use();

    // Later, clean up
    resource.destroy();
}
```

## API Reference

### Constructor Options

```javascript
_Initializable({
  initialize: true // Whether to automatically initialize (default: true)
});
```

### Instance Properties

- **initialized** (Boolean): Whether initialization completed successfully
- **initializeFailed** (Boolean): Whether initialization failed
- **initializing** (Boolean): Whether initialization is in progress

At most one is `true`. All three are `false` before initialization begins and `undefined` after the instance is destroyed. See [Initialization Status](#initialization-status).

### Instance Methods

- **initialize(...args)**: Begin initialization with the given arguments. Initialization runs only once per instance; calling `initialize()` again after initialization has started or completed has no effect. Returns the instance.
- **destroy(...args)**: Clean up and destroy the instance
- **untilInitialized()**: Return a promise that resolves with the `initializeComplete` event snapshot, or rejects with a `RejectError` if initialization fails. See [Awaiting Initialization](#awaiting-initialization).

All of the other `isotropic-pubsub` instance methods are inherited as well, including `after`, `before`, `on`, `onceAfter`, `onceBefore`, `onceOn`, `publish`, `subscribe`, and `until`.

### Protected Methods

- **_initialize(...args)**: Define initialization behavior (implemented by subclasses). May be synchronous or return a Promise; asynchronous methods are awaited before the next class in the chain initializes.
- **_initializeComplete(...args)**: Called after initialization completes successfully (can be overridden)
- **_initializeError(error)**: Called when initialization fails. **Implement this in any class whose initialization can fail.** The base implementation is an assertion that no handler was provided: it rethrows the error asynchronously so that an unhandled initialization failure surfaces as an uncaught exception. See [Initialization Error Handling](#initialization-error-handling).

### Events

Each event's `data` is described below as it appears on a subscriber's event object, or on the snapshot resolved by `until`.

- **initialize**: Published when initialization begins. `data.args` is an array of the arguments initialization was started with. Declared `completeOnce`, so initialization begins at most once.
- **initializeComplete**: Published when initialization completes successfully. `data.args` is an array of the arguments initialization was started with. Declared `publishOnce`, so subscribing after it has been published executes immediately.
- **initializeError**: Published if initialization fails. `data.error` is an `isotropic-error` with the message `'Initialize error'`; its `error` property is what `_initialize` threw. Declared `publishOnce`, so subscribing after it has been published executes immediately.

Neither `initializeComplete` nor `initializeError` is published if the instance is destroyed while asynchronous initialization is still pending.

## Integration with Other isotropic Modules

isotropic-initializable works seamlessly with other modules in the isotropic ecosystem:

- **isotropic-error**: Nested error reporting for initialization failures
- **isotropic-later**: Asynchronous utilities
- **isotropic-make**: Create constructor functions with inheritance and mixins
- **isotropic-pubsub**: Event system for the observable lifecycle

## Contributing

Please refer to [CONTRIBUTING.md](https://github.com/ibi-group/isotropic-initializable/blob/main/CONTRIBUTING.md) for contribution guidelines.

## Issues

If you encounter any issues, please file them at https://github.com/ibi-group/isotropic-initializable/issues
