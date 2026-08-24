import _Dispatcher from 'isotropic-pubsub/lib/dispatcher.js';
import _Error from 'isotropic-error';
import _later from 'isotropic-later';
import _make from 'isotropic-make';
import _mixinPrototypeChain from 'isotropic-mixin-prototype-chain';
import _Pubsub from 'isotropic-pubsub';

export default _make('Initializable', [
    _Pubsub
], {
    initialize (...args) {
        return this._publish('initialize', {
            args
        });
    },
    get initialized () {
        return this._initialized;
    },
    get initializeFailed () {
        if (this._destroyed) {
            return void null;
        }

        if (this._getOnceEventSnapshot('initializeError')) {
            return true;
        }

        return false;
    },
    get initializing () {
        if (this._destroyed) {
            return void null;
        }

        if (!this._initialized && this._getOnceEventSnapshot('initialize') && !this._getOnceEventSnapshot('initializeError')) {
            return true;
        }

        return false;
    },
    untilInitialized (config = {}) {
        return this.until({
            ...config,
            eventName: 'initializeComplete',
            reject: [
                'destroyComplete',
                'initializeError'
            ],
            subject: 'Initialization'
        });
    },
    _destroy (...args) {
        this._initialized = void null;

        Reflect.apply(_Pubsub.prototype._destroy, this, args);
    },
    _eventInitialize ({
        data: {
            args
        }
    }) {
        const initializePromise = this._executeInitializeMethods(...args);

        if (this._initialized) {
            this._publish('initializeComplete', {
                args
            });
        } else {
            initializePromise.then(() => {
                if (!this._destroyed) {
                    this._publish('initializeComplete', {
                        args
                    });
                }
            }).catch(error => {
                if (!this._destroyed) {
                    this._initialized = false;

                    this._publish('initializeError', {
                        error: _Error({
                            error,
                            message: 'Initialize error'
                        })
                    });
                }
            });
        }
    },
    _eventInitializeComplete ({
        data: {
            args
        }
    }) {
        this._initializeComplete(...args);
    },
    _eventInitializeError ({
        data: {
            error
        }
    }) {
        this._initializeError(error);
    },
    async _executeInitializeMethods (...args) {
        for (const object of this._getInitializationObjects()) {
            const result = Reflect.apply(object._initialize, this, args);

            if (result && typeof result.then === 'function') {
                await result;
            }
        }

        if (!this._destroyed) {
            this._initialized = true;
        }

        return this;
    },
    _getInitializationObjects () {
        const doNotInitialize = new Set(),
            initializationObjects = [],
            objectByInitializeMethodMap = new Map();

        for (const object of _mixinPrototypeChain.fromInstanceObject(this)) {
            if (Object.hasOwn(object, '_doNotInitialize')) {
                if (Array.isArray(object._doNotInitialize) || object._doNotInitialize instanceof Set) {
                    object._doNotInitialize.forEach(object => {
                        doNotInitialize.add(object.prototype || object);
                    });
                } else {
                    doNotInitialize.add(object._doNotInitialize.prototype || object._doNotInitialize);
                }
            }

            if (Object.hasOwn(object, '_initialize') && !doNotInitialize.has(object)) {
                const previousObject = objectByInitializeMethodMap.get(object._initialize);

                if (previousObject) {
                    initializationObjects.splice(initializationObjects.indexOf(previousObject), 1);
                }

                initializationObjects.unshift(object);
                objectByInitializeMethodMap.set(object._initialize, object);
            }
        }

        return initializationObjects;
    },
    _init (...args) {
        const [{
            initialize = true
        } = {}] = args;

        Reflect.apply(_Pubsub.prototype._init, this, args);

        this._initialized = false;

        return initialize ?
            this.initialize(...args) :
            this;
    },
    _initializeComplete () {
        // empty method
    },
    _initializeError (error) {
        _later.asap(() => {
            throw _Error({
                error
            });
        });
    }
}, {
    _pubsub: {
        initialize: {
            completeFunction: '_eventInitialize',
            completeOnce: true,
            Dispatcher: _Dispatcher
        },
        initializeComplete: {
            completeFunction: '_eventInitializeComplete',
            Dispatcher: _Dispatcher,
            publishOnce: true
        },
        initializeError: {
            completeFunction: '_eventInitializeError',
            Dispatcher: _Dispatcher,
            publishOnce: true
        }
    }
});
