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

### Initialization Status

You can check the initialization status of any Initializable object:

```javascript
const component = _Component();

console.log(component.initialized); // true if initialization completed
```

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

    // Listen for completion
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
    _eventInitializeError ({
        data: {
            error
        }
    }) {
        // This event handler method gets executed if initialization fails.
        console.error('Initialization failed:', error);
    },
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
    }
});

{
    const component = _RiskyComponent({
        // Missing apiKey
    });
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

- **initialized** (Boolean): Whether initialization has completed successfully

### Instance Methods

- **initialize(...args)**: Begin initialization with the given arguments. Initialization runs only once per instance; calling `initialize()` again after initialization has started or completed has no effect. Returns the instance.
- **destroy(...args)**: Clean up and destroy the instance

### Protected Methods

- **_initialize(...args)**: Define initialization behavior (implemented by subclasses). May be synchronous or return a Promise; asynchronous methods are awaited before the next class in the chain initializes.
- **_initializeComplete(...args)**: Called after initialization completes successfully (can be overridden)
- **_initializeError(error)**: Called when initialization fails (can be overridden). The default implementation re-throws the error asynchronously, so that an unhandled initialization failure surfaces as an uncaught exception; override it to handle initialization errors yourself.

### Events

- **initialize**: Triggered when initialization begins
- **initializeComplete**: Triggered when initialization completes successfully
- **initializeError**: Triggered if initialization fails, with error data

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
