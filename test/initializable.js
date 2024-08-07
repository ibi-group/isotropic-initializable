import _chai from 'isotropic-dev-dependencies/lib/chai.js';
import _domain from 'node:domain'; // eslint-disable-line isotropic/node/no-deprecated-api -- TODO: Find a way to implement this test without a domain.
import _Error from 'isotropic-error';
import _Initializable from '../js/initializable.js';
import _later from 'isotropic-later';
import _make from 'isotropic-make';
import _mocha from 'isotropic-dev-dependencies/lib/mocha.js';

_mocha.describe('_Initializable', function () {
    this.timeout(377);

    _mocha.it('should construct initializable objects', () => {
        _chai.expect(_Initializable).to.be.a('function');

        const initializable = new _Initializable();

        _chai.expect(initializable).to.be.an.instanceOf(_Initializable);

        _chai.expect(initializable).to.have.property('initialized', true);

        initializable.destroy();

        _chai.expect(initializable.initialized).to.be.undefined;
    });

    _mocha.it('should be an initializable object factory', () => {
        _chai.expect(_Initializable).to.be.a('function');

        const initializable = _Initializable();

        _chai.expect(initializable).to.be.an.instanceOf(_Initializable);

        _chai.expect(initializable).to.have.property('initialized', true);

        initializable.destroy();

        _chai.expect(initializable.initialized).to.be.undefined;
    });

    _mocha.it('should pass initialization arguments', () => {
        let initializeExecuted = false;

        const CustomInitializable = _make(_Initializable, {
            _initialize (...args) {
                _chai.expect(args).to.deep.equal([
                    'a',
                    'b',
                    'c'
                ]);
                initializeExecuted = true;
            }
        });

        CustomInitializable('a', 'b', 'c');

        _chai.expect(initializeExecuted).to.be.true;
    });

    _mocha.it('should allow construction without initialization', () => {
        const initializable = _Initializable({
            initialize: false
        });

        _chai.expect(initializable).to.have.property('initialized', false);

        initializable.destroy('never initialized');

        _chai.expect(initializable.initialized).to.be.undefined;
    });

    _mocha.it('should allow observation of initialization', () => {
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

    _mocha.it('should call every inherited _initialize method', () => {
        let z;

        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push('A');
                }
            }),
            B = _make({
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push('B');
                }
            }),
            C = _make({
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push('C');
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push('X');
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push('Y');
                }
            }),
            Z = _make(Y, [
                C
            ], {
                _initialize () {
                    _chai.expect(this).to.equal(z);
                    initializeExecuted.push('Z');
                }
            });

        z = Z({
            initialize: false
        });

        z._initialize = () => {
            initializeExecuted.push('z');
        };

        z.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            'A',
            'X',
            'B',
            'Y',
            'C',
            'Z',
            'z'
        ]);
    });

    _mocha.it('should initialize mixins in definition order', () => {
        let e;

        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push('A');
                }
            }),
            B = _make({
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push('B');
                }
            }),
            C = _make({
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push('C');
                }
            }),
            D = _make({
                _initialize () {
                    _chai.expect(this).to.equal(e);
                    initializeExecuted.push('D');
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
                    initializeExecuted.push('E');
                }
            });

        e = E({
            initialize: false
        });

        e._initialize = () => {
            initializeExecuted.push('e');
        };

        e.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            'A',
            'B',
            'C',
            'D',
            'E',
            'e'
        ]);
    });

    _mocha.it('should not call inherited _initialize methods on _doNotInitialize objects', () => {
        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    initializeExecuted.push('A');
                }
            }),
            B = _make({
                _initialize () {
                    initializeExecuted.push('B');
                }
            }),
            C = _make({
                _initialize () {
                    initializeExecuted.push('C');
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _doNotInitialize: A,
                _initialize () {
                    initializeExecuted.push('X');
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push('Y');
                }
            }),
            Z = _make(Y, [
                C
            ], {
                _doNotInitialize: B,
                _initialize () {
                    initializeExecuted.push('Z');
                }
            }),
            z = Z({
                initialize: false
            });

        z._doNotInitialize = z;

        z._initialize = () => {
            initializeExecuted.push('z');
        };

        z.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            'X',
            'Y',
            'C',
            'Z'
        ]);
    });

    _mocha.it('should not call inherited _initialize methods on objects in a _doNotInitialize array', () => {
        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    initializeExecuted.push('A');
                }
            }),
            B = _make({
                _initialize () {
                    initializeExecuted.push('B');
                }
            }),
            C = _make({
                _initialize () {
                    initializeExecuted.push('C');
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _doNotInitialize: [
                    A
                ],
                _initialize () {
                    initializeExecuted.push('X');
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push('Y');
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
                    initializeExecuted.push('Z');
                }
            }),
            z = Z({
                initialize: false
            });

        z._doNotInitialize = [
            z
        ];

        z._initialize = () => {
            initializeExecuted.push('z');
        };

        z.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            'X',
            'Y',
            'Z'
        ]);
    });

    _mocha.it('should not call inherited _initialize methods on objects in a _doNotInitialize set', () => {
        const initializeExecuted = [],

            A = _make({
                _initialize () {
                    initializeExecuted.push('A');
                }
            }),
            B = _make({
                _initialize () {
                    initializeExecuted.push('B');
                }
            }),
            C = _make({
                _initialize () {
                    initializeExecuted.push('C');
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _doNotInitialize: new Set([
                    A
                ]),
                _initialize () {
                    initializeExecuted.push('X');
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push('Y');
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
                    initializeExecuted.push('Z');
                }
            }),
            z = Z({
                initialize: false
            });

        z._doNotInitialize = new Set([
            z
        ]);

        z._initialize = () => {
            initializeExecuted.push('z');
        };

        z.initialize();

        _chai.expect(initializeExecuted).to.deep.equal([
            'X',
            'Y',
            'Z'
        ]);
    });

    _mocha.it('should await async inherited _initialize methods', callbackFunction => {
        const initializeExecuted = [],

            A = _make({
                async _initialize () {
                    await new Promise(resolve => {
                        _later(34, resolve);
                    });

                    initializeExecuted.push('A');
                }
            }),
            B = _make({
                async _initialize () {
                    await new Promise(resolve => {
                        _later(21, resolve);
                    });

                    initializeExecuted.push('B');
                }
            }),
            C = _make({
                async _initialize () {
                    await new Promise(resolve => {
                        _later(13, resolve);
                    });

                    initializeExecuted.push('C');
                }
            }),
            X = _make(_Initializable, [
                A
            ], {
                _initialize () {
                    initializeExecuted.push('X');
                }
            }),
            Y = _make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push('Y');
                }
            }),
            Z = _make(Y, [
                C
            ], {
                _initialize () {
                    initializeExecuted.push('Z');
                }
            }),
            z = Z({
                initialize: false
            });

        z._initialize = async () => {
            initializeExecuted.push('z');

            await new Promise(resolve => {
                _later(2, resolve);
            });
        };

        z.on('initializeComplete', () => {
            _chai.expect(initializeExecuted).to.deep.equal([
                'A',
                'X',
                'B',
                'Y',
                'C',
                'Z',
                'z'
            ]);

            callbackFunction();
        });

        z.initialize();
    });

    _mocha.it('should handle initialization errors', callbackFunction => {
        let capturedError,
            subscriptionExecuted = false;

        const CustomInitializable = _make(_Initializable, {
                _initialize () {
                    throw _Error({
                        name: 'CustomInitializationError'
                    });
                }
            }),
            customInitializable = CustomInitializable(),
            domain = _domain.create();

        _chai.expect(customInitializable).to.have.property('initialized', false);

        customInitializable.on('initializeError', ({
            data: {
                error
            }
        }) => {
            _chai.expect(error).to.be.an.instanceOf(_Error);
            _chai.expect(error).to.have.property('name', 'CustomInitializationError');
            subscriptionExecuted = true;
            domain.enter();
        });

        domain.on('error', error => {
            capturedError = error;
            domain.exit();
        });

        _later(55, () => {
            _chai.expect(subscriptionExecuted).to.be.true;
            _chai.expect(capturedError).to.have.property('name', 'CustomInitializationError');
            callbackFunction();
        });
    });

    _mocha.it('should work with mixins', () => {
        const methodsExecuted = [],

            A = _make([
                _Initializable
            ], {
                _init (...args) {
                    return Reflect.apply(_Initializable.prototype._init, this, args);
                },
                _initialize () {
                    methodsExecuted.push('a');
                }
            }),
            B = _make([
                A
            ], {
                _init (...args) {
                    return Reflect.apply(_Initializable.prototype._init, this, args);
                }
            }),
            C = _make([
                B
            ], {
                _init (...args) {
                    return Reflect.apply(_Initializable.prototype._init, this, args);
                },
                _initialize () {
                    methodsExecuted.push('c');
                }
            }),
            c = C();

        _chai.expect(c).not.to.be.an.instanceOf(_Initializable);

        _chai.expect(c).to.have.property('initialized', true);

        _chai.expect(methodsExecuted).to.deep.equal([
            'a',
            'c'
        ]);

        c.destroy();

        _chai.expect(c.initialized).to.be.undefined;
    });
});
