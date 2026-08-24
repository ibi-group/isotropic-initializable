import _chai from 'isotropic-dev-dependencies/lib/chai.js';
import _Error from 'isotropic-error';
import _Initializable from '../lib/initializable.js';
import _later from 'isotropic-later';
import _make from 'isotropic-make';
import _process from 'node:process';
import _test from 'node:test';

_test.describe('_Initializable', () => {
    _test.it('should construct initializable objects', () => {
        _chai.expect(_Initializable).to.be.a('function');
        _chai.expect(_Initializable).to.have.property('name').that.equals('Initializable');

        const initializable = new _Initializable();

        _chai.expect(initializable).to.be.an('Initializable');
        _chai.expect(initializable).to.be.an.instanceOf(_Initializable);
        _chai.expect(initializable).to.have.property('initialize').that.is.a('function');
        _chai.expect(initializable).to.have.property('initialized', true);

        initializable.destroy();

        _chai.expect(initializable.initialized).to.be.undefined;
    });

    _test.it('should be an initializable object factory', () => {
        const initializable = _Initializable();

        _chai.expect(initializable).to.be.an.instanceOf(_Initializable);
        _chai.expect(initializable).to.have.property('initialize').that.is.a('function');
        _chai.expect(initializable).to.have.property('initialized', true);

        initializable.destroy();

        _chai.expect(initializable.initialized).to.be.undefined;
    });

    _test.it('should pass initialization arguments', () => {
        let initializeExecuted = false;

        _make(_Initializable, {
            _initialize (...args) {
                _chai.expect(args).to.deep.equal([
                    'a',
                    'b',
                    'c'
                ]);
                initializeExecuted = true;
            }
        })('a', 'b', 'c');

        _chai.expect(initializeExecuted).to.be.true;
    });

    _test.it('should allow construction without initialization', () => {
        const initializable = _Initializable({
            initialize: false
        });

        _chai.expect(initializable).to.have.property('initialized', false);

        initializable.destroy('never initialized');

        _chai.expect(initializable.initialized).to.be.undefined;
    });

    _test.it('should allow observation of initialization', () => {
        const initializable = _Initializable({
                initialize: false
            }),
            subscriptionsExecuted = [];

        _chai.expect(initializable).to.have.property('initialized', false);

        initializable._initialize = function (...args) {
            _chai.expect(args).to.deep.equal([
                'a',
                'b',
                'c'
            ]);
            subscriptionsExecuted.push('defaultInitialize');
        };

        initializable._initializeComplete = function (...args) {
            _chai.expect(args).to.deep.equal([
                'a',
                'b',
                'c'
            ]);
            subscriptionsExecuted.push('defaultInitializeComplete');
            Reflect.apply(_Initializable.prototype._initializeComplete, this, args);
        };

        initializable.after('initialize', () => {
            _chai.expect(initializable).to.have.property('initialized', true);
            subscriptionsExecuted.push('afterInitialize');
        });

        initializable.on('initialize', () => {
            _chai.expect(initializable).to.have.property('initialized', false);
            subscriptionsExecuted.push('onInitialize');
        });

        initializable.on('initializeComplete', () => {
            _chai.expect(initializable).to.have.property('initialized', true);
            subscriptionsExecuted.push('onInitializeComplete');
        });

        initializable.initialize('a', 'b', 'c');

        _chai.expect(initializable).to.have.property('initialized', true);
        _chai.expect(subscriptionsExecuted).to.deep.equal([
            'onInitialize',
            'defaultInitialize',
            'onInitializeComplete',
            'defaultInitializeComplete',
            'afterInitialize'
        ]);
    });

    _test.it('should call every inherited _initialize method', () => {
        let z;

        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push(A);
                }
            }),
            B = _make({
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push(B);
                }
            }),
            C = _make({
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push(C);
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push(X);
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push(Y);
                }
            }),
            Z = _make(Y, [
                C
            ], {
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push(Z);
                }
            });

        z = Z({
            initialize: false
        });

        z._initialize = () => {
            initializeExecuted.push(z);
        };

        z.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            A,
            X,
            B,
            Y,
            C,
            Z,
            z
        ]);
    });

    _test.it('should initialize mixins in definition order', () => {
        let e;

        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push(A);
                }
            }),
            B = _make({
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push(B);
                }
            }),
            C = _make({
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push(C);
                }
            }),
            D = _make({
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push(D);
                }
            }),
            E = _make(_Initializable, [
                A,
                B,
                C,
                D
            ], {
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push(E);
                }
            });

        e = E({
            initialize: false
        });

        e._initialize = () => {
            initializeExecuted.push(e);
        };

        e.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            A,
            B,
            C,
            D,
            E,
            e
        ]);
    });

    _test.it('should call an inherited _initialize method only once, at deepest position, when it is inherited multiple times', () => {
        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    initializeExecuted.push(A);
                }
            }),
            B = _make(A, {
                _initialize () {
                    initializeExecuted.push(B);
                }
            }),
            C = _make(A, {
                _initialize () {
                    initializeExecuted.push(C);
                }
            }),
            D = _make(_Initializable, [
                B,
                C
            ], {
                _initialize () {
                    initializeExecuted.push(D);
                }
            });

        D();

        _chai.expect(initializeExecuted).to.deep.equal([
            A,
            B,
            C,
            D
        ]);
    });

    _test.it('should not call inherited _initialize methods on _doNotInitialize objects', () => {
        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    initializeExecuted.push(A);
                }
            }),
            B = _make({
                _initialize () {
                    initializeExecuted.push(B);
                }
            }),
            C = _make({
                _initialize () {
                    initializeExecuted.push(C);
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _doNotInitialize: A,
                _initialize () {
                    initializeExecuted.push(X);
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push(Y);
                }
            }),
            Z = _make(Y, [
                C
            ], {
                _doNotInitialize: B,
                _initialize () {
                    initializeExecuted.push(Z);
                }
            }),
            z = Z({
                initialize: false
            });

        z._doNotInitialize = z;

        z._initialize = () => {
            initializeExecuted.push(z);
        };

        z.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            X,
            Y,
            C,
            Z
        ]);
    });

    _test.it('should not call inherited _initialize methods on objects in a _doNotInitialize array', () => {
        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    initializeExecuted.push(A);
                }
            }),
            B = _make({
                _initialize () {
                    initializeExecuted.push(B);
                }
            }),
            C = _make({
                _initialize () {
                    initializeExecuted.push(C);
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _doNotInitialize: [
                    A
                ],
                _initialize () {
                    initializeExecuted.push(X);
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push(Y);
                }
            }),
            Z = _make(Y, [
                C
            ], {
                _doNotInitialize: [
                    B,
                    C
                ],
                _initialize () {
                    initializeExecuted.push(Z);
                }
            }),
            z = Z({
                initialize: false
            });

        z._doNotInitialize = [
            z
        ];

        z._initialize = () => {
            initializeExecuted.push(z);
        };

        z.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            X,
            Y,
            Z
        ]);
    });

    _test.it('should not call inherited _initialize methods on objects in a _doNotInitialize set', () => {
        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    initializeExecuted.push(A);
                }
            }),
            B = _make({
                _initialize () {
                    initializeExecuted.push(B);
                }
            }),
            C = _make({
                _initialize () {
                    initializeExecuted.push(C);
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _doNotInitialize: new Set([
                    A
                ]),
                _initialize () {
                    initializeExecuted.push(X);
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push(Y);
                }
            }),
            Z = _make(Y, [
                C
            ], {
                _doNotInitialize: new Set([
                    B,
                    C
                ]),
                _initialize () {
                    initializeExecuted.push(Z);
                }
            }),
            z = Z({
                initialize: false
            });

        z._doNotInitialize = new Set([
            z
        ]);

        z._initialize = () => {
            initializeExecuted.push(z);
        };

        z.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            X,
            Y,
            Z
        ]);
    });

    _test.it('should await async inherited _initialize methods', {
        timeout: 377
    }, (test, callbackFunction) => {
        const initializeExecuted = [],

            A = _make({
                async _initialize () {
                    await new Promise(resolve => {
                        _later(34, resolve);
                    });

                    initializeExecuted.push(A);
                }
            }),
            B = _make({
                async _initialize () {
                    await new Promise(resolve => {
                        _later(21, resolve);
                    });

                    initializeExecuted.push(B);
                }
            }),
            C = _make({
                async _initialize () {
                    await new Promise(resolve => {
                        _later(13, resolve);
                    });

                    initializeExecuted.push(C);
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _initialize () {
                    initializeExecuted.push(X);
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push(Y);
                }
            }),
            Z = _make(Y, [
                C
            ], {
                _initialize () {
                    initializeExecuted.push(Z);
                }
            }),
            z = Z({
                initialize: false
            });

        z._initialize = async () => {
            initializeExecuted.push(z);

            await new Promise(resolve => {
                _later(2, resolve);
            });
        };

        z.on('initializeComplete', () => {
            _chai.expect(initializeExecuted).to.deep.equal([
                A,
                X,
                B,
                Y,
                C,
                Z,
                z
            ]);

            callbackFunction();
        });

        z.initialize();
    });

    _test.it('should handle initialization errors', {
        timeout: 377
    }, (test, callbackFunction) => {
        const customInitializable = _make(_Initializable, {
            _initialize () {
                throw _Error({
                    name: 'CustomInitializationError'
                });
            }
        })();

        _chai.expect(customInitializable).to.have.property('initialized', false);

        customInitializable.on('initializeError', ({
            data: {
                error
            }
        }) => {
            _chai.expect(error).to.be.an.instanceOf(_Error);
            _chai.expect(error).to.have.property('name', 'CustomInitializationError');

            const emit = _process.emit;

            _process.emit = (...args) => {
                if (args[0] === 'uncaughtException' && args[1]?.error === error) {
                    _process.emit = emit;

                    _later.asap(() => {
                        callbackFunction();
                    });

                    return true;
                }

                return Reflect.apply(emit, _process, args);
            };
        });
    });

    _test.it('should work with mixins', () => {
        const methodsExecuted = [],

            A = _make([
                _Initializable
            ], {
                _init (...args) {
                    methodsExecuted.push(A, '_init');

                    return Reflect.apply(_Initializable.prototype._init, this, args);
                },
                _initialize () {
                    methodsExecuted.push(A, '_initialize');
                }
            }),
            B = _make([
                A
            ], {
                _init (...args) {
                    methodsExecuted.push(B, '_init');

                    return Reflect.apply(_Initializable.prototype._init, this, args);
                }
            }),
            C = _make([
                B
            ], {
                _init (...args) {
                    methodsExecuted.push(C, '_init');

                    return Reflect.apply(_Initializable.prototype._init, this, args);
                },
                _initialize () {
                    methodsExecuted.push(C, '_initialize');
                }
            }),
            c = C();

        _chai.expect(c).not.to.be.an.instanceOf(_Initializable);

        _chai.expect(c).to.have.property('initialized', true);

        _chai.expect(methodsExecuted).to.deep.equal([
            C,
            '_init',
            A,
            '_initialize',
            C,
            '_initialize'
        ]);

        c.destroy();

        _chai.expect(c.initialized).to.be.undefined;
    });

    _test.it('should handle rejected asynchronous _initialize methods', {
        timeout: 377
    }, (test, callbackFunction) => {
        const customInitializable = _make(_Initializable, {
            _initialize () {
                return Promise.reject(_Error({
                    name: 'AsyncInitializationError'
                }));
            }
        })();

        _chai.expect(customInitializable).to.have.property('initialized', false);

        customInitializable.on('initializeError', ({
            data: {
                error
            }
        }) => {
            _chai.expect(error).to.be.an.instanceOf(_Error);
            _chai.expect(error).to.have.property('name', 'AsyncInitializationError');

            const emit = _process.emit;

            _process.emit = (...args) => {
                if (args[0] === 'uncaughtException' && args[1]?.error === error) {
                    _process.emit = emit;

                    _later.asap(() => {
                        callbackFunction();
                    });

                    return true;
                }

                return Reflect.apply(emit, _process, args);
            };
        });
    });

    _test.it('should allow _initializeError to be overridden to handle errors', {
        timeout: 377
    }, (test, callbackFunction) => {
        _chai.expect(_make(_Initializable, {
            _initialize () {
                throw _Error({
                    name: 'CustomInitializationError'
                });
            },
            _initializeError (error) {
                _chai.expect(error).to.be.an.instanceOf(_Error);
                _chai.expect(error).to.have.property('name', 'CustomInitializationError');

                callbackFunction();
            }
        })()).to.have.property('initialized', false);
    });

    _test.it('should initialize only once', () => {
        let initializeCount = 0;

        const customInitializable = _make(_Initializable, {
            _initialize () {
                initializeCount += 1;
            }
        })();

        _chai.expect(customInitializable).to.have.property('initialized', true);
        _chai.expect(initializeCount).to.equal(1);

        customInitializable.initialize();
        customInitializable.initialize();

        _chai.expect(customInitializable).to.have.property('initialized', true);
        _chai.expect(initializeCount).to.equal(1);

        customInitializable.destroy();
    });

    _test.it('should not crash when destroyed during asynchronous initialization', {
        timeout: 377
    }, (test, callbackFunction) => {
        const customInitializable = _make(_Initializable, {
            _initialize () {
                return new Promise(resolve => {
                    _later(2, resolve);
                });
            }
        })();

        _chai.expect(customInitializable).to.have.property('initialized', false);

        customInitializable.destroy();

        _chai.expect(customInitializable.initialized).to.be.undefined;

        _later(10, () => {
            _chai.expect(customInitializable.initialized).to.be.undefined;

            callbackFunction();
        });
    });

    _test.it('should not crash when destroyed during asynchronous initialization that fails', {
        timeout: 377
    }, (test, callbackFunction) => {
        const customInitializable = _make(_Initializable, {
            _initialize () {
                return new Promise((resolve, reject) => {
                    _later(2, () => {
                        reject(_Error({
                            name: 'AsyncInitializationError'
                        }));
                    });
                });
            }
        })();

        _chai.expect(customInitializable).to.have.property('initialized', false);

        customInitializable.destroy();

        _later(10, () => {
            _chai.expect(customInitializable.initialized).to.be.undefined;

            callbackFunction();
        });
    });

    _test.it('should resolve an until promise when asynchronous initialization completes', async () => {
        const customInitializable = _make(_Initializable, {
            _initialize () {
                return new Promise(resolve => {
                    _later(2, resolve);
                });
            }
        })('a', 'b');

        _chai.expect(customInitializable).to.have.property('initialized', false);

        {
            const eventSnapshot = await customInitializable.until('initializeComplete');

            _chai.expect(eventSnapshot).to.have.property('name', 'initializeComplete');
            _chai.expect(eventSnapshot).to.have.property('stageName', 'after');
            _chai.expect(eventSnapshot).to.have.property('publisher', customInitializable);
            _chai.expect(eventSnapshot.data.args).to.deep.equal([
                'a',
                'b'
            ]);
        }

        _chai.expect(customInitializable).to.have.property('initialized', true);

        customInitializable.destroy();
    });

    _test.it('should resolve an until promise for an already initialized object', async () => {
        const customInitializable = _Initializable();

        _chai.expect(customInitializable).to.have.property('initialized', true);

        _chai.expect(await customInitializable.until('initializeComplete')).to.have.property('name', 'initializeComplete');

        customInitializable.destroy();
    });

    _test.it('should resolve an until promise racing initializeComplete and initializeError', async () => {
        const customInitializable = _make(_Initializable, {
            _initialize () {
                return Promise.reject(_Error({
                    name: 'AsyncInitializationError'
                }));
            },
            _initializeError () {
                // The awaiting code takes responsibility for the failure
            }
        })();

        {
            const eventSnapshot = await customInitializable.until({
                eventName: [
                    'initializeComplete',
                    'initializeError'
                ]
            });

            _chai.expect(eventSnapshot).to.have.property('name', 'initializeError');
            _chai.expect(eventSnapshot.data.error).to.be.an.instanceOf(_Error);
            _chai.expect(eventSnapshot.data.error).to.have.property('message', 'Initialize error');
            _chai.expect(eventSnapshot.data.error.error).to.have.property('name', 'AsyncInitializationError');
        }

        _chai.expect(customInitializable).to.have.property('initialized', false);

        customInitializable.destroy();
    });

    _test.it('should resolve an until promise for an initializeError that was already published', async () => {
        const customInitializable = _make(_Initializable, {
            _initialize () {
                return Promise.reject(_Error({
                    name: 'AsyncInitializationError'
                }));
            },
            _initializeError () {
                // The awaiting code takes responsibility for the failure
            }
        })();

        await customInitializable.until('initializeError');

        {
            const eventSnapshot = await customInitializable.until('initializeError');

            _chai.expect(eventSnapshot).to.have.property('name', 'initializeError');
            _chai.expect(eventSnapshot.data.error.error).to.have.property('name', 'AsyncInitializationError');
        }

        customInitializable.destroy();
    });

    _test.it('should resolve an until promise when deferred initialization begins', async () => {
        const customInitializable = _Initializable({
                initialize: false
            }),
            promise = customInitializable.until('initialize');

        _chai.expect(customInitializable).to.have.property('initialized', false);

        _later(2, () => {
            customInitializable.initialize('a', 'b');
        });

        {
            const eventSnapshot = await promise;

            _chai.expect(eventSnapshot).to.have.property('name', 'initialize');
            _chai.expect(eventSnapshot.data.args).to.deep.equal([
                'a',
                'b'
            ]);
        }

        customInitializable.destroy();
    });

    _test.it('should resolve an until promise racing initializeComplete and destroyComplete', async () => {
        const customInitializable = _make(_Initializable, {
                _initialize () {
                    return new Promise(resolve => {
                        _later(21, resolve);
                    });
                }
            })(),
            promise = customInitializable.until({
                eventName: [
                    'destroyComplete',
                    'initializeComplete'
                ]
            });

        customInitializable.destroy();

        _chai.expect(await promise).to.have.property('name', 'destroyComplete');
    });

    _test.it('should reject an until promise when initialization exceeds a timeout', async () => {
        let rejectedError = null;

        const customInitializable = _Initializable({
            initialize: false
        });

        try {
            await customInitializable.until({
                eventName: 'initializeComplete',
                subject: 'Initialization',
                timeout: 2
            });
        } catch (error) {
            rejectedError = error;
        }

        _chai.expect(rejectedError).to.have.property('name', 'TimeoutError');
        _chai.expect(rejectedError).to.have.property('message', 'Initialization timed out');

        customInitializable.destroy();
    });

    _test.it('should resolve untilInitialized when initialization completes', async () => {
        const customInitializable = _make(_Initializable, {
            _initialize () {
                return new Promise(resolve => {
                    _later(2, resolve);
                });
            }
        })('a', 'b');

        {
            const eventSnapshot = await customInitializable.untilInitialized();

            _chai.expect(eventSnapshot).to.have.property('name', 'initializeComplete');
            _chai.expect(eventSnapshot).to.have.property('publisher', customInitializable);
            _chai.expect(eventSnapshot.data.args).to.deep.equal([
                'a',
                'b'
            ]);
        }

        _chai.expect(customInitializable).to.have.property('initialized', true);

        customInitializable.destroy();
    });

    _test.it('should resolve untilInitialized for an already initialized object', async () => {
        const customInitializable = _Initializable();

        _chai.expect(await customInitializable.untilInitialized()).to.have.property('name', 'initializeComplete');

        customInitializable.destroy();
    });

    _test.it('should reject untilInitialized when initialization fails', async () => {
        let error;

        const customInitializable = _make(_Initializable, {
            _initialize () {
                return Promise.reject(_Error({
                    name: 'AsyncInitializationError'
                }));
            },
            _initializeError () {
                // The awaiting code takes responsibility for the failure
            }
        })();

        try {
            await customInitializable.untilInitialized();
        } catch (caughtError) {
            error = caughtError;
        }

        _chai.expect(error).to.be.an.instanceOf(_Error);
        _chai.expect(error).to.have.property('name', 'RejectError');
        _chai.expect(error).to.have.property('message', 'Initialization rejected');
        _chai.expect(error.details.eventSnapshot).to.have.property('name', 'initializeError');
        _chai.expect(error.details.eventSnapshot.data.error.error).to.have.property('name', 'AsyncInitializationError');

        customInitializable.destroy();
    });

    _test.it('should reject untilInitialized when the instance gets destroyed during initialization', async () => {
        let error;

        const customInitializable = _make(_Initializable, {
                _initialize () {
                    return new Promise(resolve => {
                        _later(2, resolve);
                    });
                }
            })(),
            promise = customInitializable.untilInitialized();

        customInitializable.destroy();

        try {
            await promise;
        } catch (caughtError) {
            error = caughtError;
        }

        _chai.expect(error).to.be.an.instanceOf(_Error);
        _chai.expect(error).to.have.property('name', 'RejectError');
        _chai.expect(error).to.have.property('message', 'Initialization rejected');
        _chai.expect(error.details.eventSnapshot).to.have.property('name', 'destroyComplete');
    });

    _test.it('should reject untilInitialized for an object whose initialization already failed', async () => {
        let error;

        const customInitializable = _make(_Initializable, {
            _initialize () {
                return Promise.reject(_Error({
                    name: 'AsyncInitializationError'
                }));
            },
            _initializeError () {
                // The awaiting code takes responsibility for the failure
            }
        })();

        await customInitializable.until('initializeError');

        try {
            await customInitializable.untilInitialized();
        } catch (caughtError) {
            error = caughtError;
        }

        _chai.expect(error).to.have.property('name', 'RejectError');

        customInitializable.destroy();
    });

    _test.it('should allow an untilInitialized promise to be canceled', async () => {
        let error;

        const abortController = new AbortController(),
            abortReason = _Error({
                message: 'Abort reason',
                name: 'AbortReasonError'
            }),
            customInitializable = _make(_Initializable, {
                _initialize () {
                    return new Promise(resolve => {
                        _later(2, resolve);
                    });
                }
            })();

        abortController.abort(abortReason);

        try {
            await customInitializable.untilInitialized({
                signal: abortController.signal
            });
        } catch (caughtError) {
            error = caughtError;
        }

        _chai.expect(error).to.be.an.instanceOf(_Error);
        _chai.expect(error).to.have.property('error', abortReason);
        _chai.expect(error).to.have.property('message', 'Initialization aborted');
        _chai.expect(error).to.have.property('name', 'AbortError');

        customInitializable.destroy();
    });

    _test.it('should allow an untilInitialized promise to be unsubscribed', () => {
        const customInitializable = _make(_Initializable, {
                _initialize () {
                    return new Promise(resolve => {
                        _later(2, resolve);
                    });
                }
            })(),
            promise = customInitializable.untilInitialized();

        _chai.expect(promise).to.have.property('subscribed').that.is.true;
        _chai.expect(promise.unsubscribe()).to.be.true;
        _chai.expect(promise).to.have.property('subscribed').that.is.false;

        customInitializable.destroy();
    });

    _test.it('should report the initialization status', async () => {
        let error;

        const customInitializable = _make(_Initializable, {
                _initialize () {
                    return new Promise(resolve => {
                        _later(2, resolve);
                    });
                }
            })({
                initialize: false
            }),
            errorInitializable = _make(_Initializable, {
                _initialize () {
                    return Promise.reject(_Error({
                        name: 'AsyncInitializationError'
                    }));
                },
                _initializeError () {
                    // The awaiting code takes responsibility for the failure
                }
            })({
                initialize: false
            });

        _chai.expect(customInitializable).to.have.property('initialized', false);
        _chai.expect(customInitializable).to.have.property('initializeFailed', false);
        _chai.expect(customInitializable).to.have.property('initializing', false);

        customInitializable.initialize();

        _chai.expect(customInitializable).to.have.property('initialized', false);
        _chai.expect(customInitializable).to.have.property('initializeFailed', false);
        _chai.expect(customInitializable).to.have.property('initializing', true);

        await customInitializable.untilInitialized();

        _chai.expect(customInitializable).to.have.property('initialized', true);
        _chai.expect(customInitializable).to.have.property('initializeFailed', false);
        _chai.expect(customInitializable).to.have.property('initializing', false);

        customInitializable.destroy();

        _chai.expect(customInitializable.initialized).to.be.undefined;
        _chai.expect(customInitializable.initializeFailed).to.be.undefined;
        _chai.expect(customInitializable.initializing).to.be.undefined;

        _chai.expect(errorInitializable).to.have.property('initialized', false);
        _chai.expect(errorInitializable).to.have.property('initializeFailed', false);
        _chai.expect(errorInitializable).to.have.property('initializing', false);

        errorInitializable.initialize();

        _chai.expect(errorInitializable).to.have.property('initialized', false);
        _chai.expect(errorInitializable).to.have.property('initializeFailed', false);
        _chai.expect(errorInitializable).to.have.property('initializing', true);

        try {
            await errorInitializable.untilInitialized();
        } catch (caughtError) {
            error = caughtError;
        }

        _chai.expect(error).to.have.property('name', 'RejectError');

        _chai.expect(errorInitializable).to.have.property('initialized', false);
        _chai.expect(errorInitializable).to.have.property('initializeFailed', true);
        _chai.expect(errorInitializable).to.have.property('initializing', false);

        errorInitializable.destroy();

        _chai.expect(errorInitializable.initialized).to.be.undefined;
        _chai.expect(errorInitializable.initializeFailed).to.be.undefined;
        _chai.expect(errorInitializable.initializing).to.be.undefined;
    });

    _test.it('should not report initializing when the initialize event is prevented', () => {
        const customInitializable = _Initializable({
            initialize: false
        });

        customInitializable.before('initialize', event => {
            event.prevent();
        });

        customInitializable.initialize();

        _chai.expect(customInitializable).to.have.property('initialized', false);
        _chai.expect(customInitializable).to.have.property('initializing', false);
        _chai.expect(customInitializable).to.have.property('initializeFailed', false);

        customInitializable.destroy();
    });
});
