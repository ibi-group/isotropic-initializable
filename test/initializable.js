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
});
