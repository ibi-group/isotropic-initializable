import _Pubsub, {
    Dispatcher as _Dispatcher
} from 'isotropic-pubsub';

import _asap from 'isotropic-asap';

import _Error from 'isotropic-error';

import _make from 'isotropic-make';

import {
    mixinPrototypeChainFromInstanceObject as _mixinPrototypeChainFromInstanceObject
} from 'isotropic-mixin-prototype-chain';

const _Initializable = _make([
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
            initializePromise
                .then(() => {
                    this._initialized = true;

                    this._publish('initializeComplete', {
                        args
                    });
                })
                .catch(error => {
                    this._initialized = false;

                    this._publish('initializeError', {
                        error: _Error({
                            error,
                            message: 'Initialize error'
                        })
                    });
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
        _asap(() => {
            throw _Error({
                error
            });
        });
    },
    async _executeInitializeMethods (...args) {
        for (const object of this._getInitializationObjects()) {
            const result = Reflect.apply(object._initialize, this, args);

            if (result && typeof result.then === 'function') {
                await result;
            }
        }

        this._initialized = true;

        return this;
    },
    _getInitializationObjects () {
        const doNotInitialize = new Set(),
            initializationObjects = [],
            initializeMethods = new Set();

        for (const object of _mixinPrototypeChainFromInstanceObject(this)) {
            if (Reflect.apply(Object.prototype.hasOwnProperty, object, [
                '_doNotInitialize'
            ])) {
                if (Array.isArray(object._doNotInitialize) || object._doNotInitialize instanceof Set) {
                    object._doNotInitialize.forEach(object => doNotInitialize.add(object.prototype || object));
                } else {
                    doNotInitialize.add(object._doNotInitialize.prototype || object._doNotInitialize);
                }
            }

            if (Reflect.apply(Object.prototype.hasOwnProperty, object, [
                '_initialize'
            ]) && !doNotInitialize.has(object) && !initializeMethods.has(object._initialize)) {
                initializationObjects.unshift(object);
                initializeMethods.add(object._initialize);
            }
        }

        return initializationObjects;
    },
    _init (...args) {
        const [{
            initialize = true
        } = {}] = args;

        _Pubsub.prototype._init.apply(this, args);

        this._initialized = false;

        return initialize ?
            this.initialize(...args) :
            this;
    },
    _initializeComplete () {
        // empty method
    }
}, {
    _events: {
        initialize: {
            allowPublicPublish: false,
            completeOnce: true,
            defaultFunction: '_eventInitialize',
            Dispatcher: _Dispatcher
        },
        initializeComplete: {
            allowPublicPublish: false,
            defaultFunction: '_eventInitializeComplete',
            Dispatcher: _Dispatcher,
            publishOnce: true
        },
        initializeError: {
            allowPublicPublish: false,
            defaultFunction: '_eventInitializeError',
            Dispatcher: _Dispatcher,
            publishOnce: true
        }
    }
});

export default _Initializable;
