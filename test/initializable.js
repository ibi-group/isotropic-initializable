import {
    describe,
    it
} from 'mocha';

import {
    create as createDomain
} from 'domain';

import Error from 'isotropic-error';

import {
    expect
} from 'chai';

import Initializable from '../js/initializable.js';

import make from 'isotropic-make';

describe('Initializable', function () {
    this.timeout(377);

    it('should construct initializable objects', () => {
        expect(Initializable).to.be.a('function');

        const initializable = new Initializable();

        expect(initializable).to.be.an.instanceOf(Initializable);

        expect(initializable).to.have.property('initialized', true);

        initializable.destroy();

        expect(initializable.initialized).to.be.undefined;
    });

    it('should be an initializable object factory', () => {
        expect(Initializable).to.be.a('function');

        const initializable = Initializable();

        expect(initializable).to.be.an.instanceOf(Initializable);

        expect(initializable).to.have.property('initialized', true);

        initializable.destroy();

        expect(initializable.initialized).to.be.undefined;
    });

    it('should pass initialization arguments', () => {
        let initializeExecuted = false;

        const CustomInitializable = make(Initializable, {
            _initialize (...args) {
                expect(args).to.deep.equal([
                    'a',
                    'b',
                    'c'
                ]);
                initializeExecuted = true;
            }
        });

        CustomInitializable('a', 'b', 'c');

        expect(initializeExecuted).to.be.true;
    });

    it('should allow construction without initialization', () => {
        const initializable = Initializable({
            initialize: false
        });

        expect(initializable).to.have.property('initialized', false);

        initializable.destroy('never initialized');

        expect(initializable.initialized).to.be.undefined;
    });

    it('should allow observation of initialization', () => {
        const initializable = Initializable({
                initialize: false
            }),
            subscriptionsExecuted = [];

        expect(initializable).to.have.property('initialized', false);

        initializable._initialize = function (...args) {
            expect(args).to.deep.equal([
                'a',
                'b',
                'c'
            ]);
            subscriptionsExecuted.push('defaultInitialize');
        };

        initializable._initializeComplete = function (...args) {
            expect(args).to.deep.equal([
                'a',
                'b',
                'c'
            ]);
            subscriptionsExecuted.push('defaultInitializeComplete');
            Reflect.apply(Initializable.prototype._initializeComplete, this, args);
        };

        initializable.after('initialize', () => {
            expect(initializable).to.have.property('initialized', true);
            subscriptionsExecuted.push('afterInitialize');
        });

        initializable.on('initialize', () => {
            expect(initializable).to.have.property('initialized', false);
            subscriptionsExecuted.push('onInitialize');
        });

        initializable.on('initializeComplete', () => {
            expect(initializable).to.have.property('initialized', true);
            subscriptionsExecuted.push('onInitializeComplete');
        });

        initializable.initialize('a', 'b', 'c');

        expect(initializable).to.have.property('initialized', true);
        expect(subscriptionsExecuted).to.deep.equal([
            'onInitialize',
            'defaultInitialize',
            'onInitializeComplete',
            'defaultInitializeComplete',
            'afterInitialize'
        ]);
    });

    it('should call every inherited _initialize method', () => {
        let z;

        const initializeExecuted = [],

            A = make({
                _initialize () {
                    expect(this).to.equal(z);
                    initializeExecuted.push('A');
                }
            }),
            B = make({
                _initialize () {
                    expect(this).to.equal(z);
                    initializeExecuted.push('B');
                }
            }),
            C = make({
                _initialize () {
                    expect(this).to.equal(z);
                    initializeExecuted.push('C');
                }
            }),
            X = make(Initializable, [
                A
            ], {
                _initialize () {
                    expect(this).to.equal(z);
                    initializeExecuted.push('X');
                }
            }),
            Y = make(X, [
                B
            ], {
                _initialize () {
                    expect(this).to.equal(z);
                    initializeExecuted.push('Y');
                }
            }),
            Z = make(Y, [
                C
            ], {
                _initialize () {
                    expect(this).to.equal(z);
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

        expect(initializeExecuted).to.deep.equal([
            'A',
            'X',
            'B',
            'Y',
            'C',
            'Z',
            'z'
        ]);
    });

    it('should not call inherited _initialize methods on _doNotInitialize objects', () => {
        const initializeExecuted = [],

            A = make({
                _initialize () {
                    initializeExecuted.push('A');
                }
            }),
            B = make({
                _initialize () {
                    initializeExecuted.push('B');
                }
            }),
            C = make({
                _initialize () {
                    initializeExecuted.push('C');
                }
            }),
            X = make(Initializable, [
                A
            ], {
                _doNotInitialize: A,
                _initialize () {
                    initializeExecuted.push('X');
                }
            }),
            Y = make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push('Y');
                }
            }),
            Z = make(Y, [
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

        expect(initializeExecuted).to.deep.equal([
            'X',
            'Y',
            'C',
            'Z'
        ]);
    });

    it('should not call inherited _initialize methods on objects in a _doNotInitialize array', () => {
        const initializeExecuted = [],

            A = make({
                _initialize () {
                    initializeExecuted.push('A');
                }
            }),
            B = make({
                _initialize () {
                    initializeExecuted.push('B');
                }
            }),
            C = make({
                _initialize () {
                    initializeExecuted.push('C');
                }
            }),
            X = make(Initializable, [
                A
            ], {
                _doNotInitialize: [
                    A
                ],
                _initialize () {
                    initializeExecuted.push('X');
                }
            }),
            Y = make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push('Y');
                }
            }),
            Z = make(Y, [
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

        expect(initializeExecuted).to.deep.equal([
            'X',
            'Y',
            'Z'
        ]);
    });

    it('should not call inherited _initialize methods on objects in a _doNotInitialize set', () => {
        const initializeExecuted = [],

            A = make({
                _initialize () {
                    initializeExecuted.push('A');
                }
            }),
            B = make({
                _initialize () {
                    initializeExecuted.push('B');
                }
            }),
            C = make({
                _initialize () {
                    initializeExecuted.push('C');
                }
            }),
            X = make(Initializable, [
                A
            ], {
                _doNotInitialize: new Set([
                    A
                ]),
                _initialize () {
                    initializeExecuted.push('X');
                }
            }),
            Y = make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push('Y');
                }
            }),
            Z = make(Y, [
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

        expect(initializeExecuted).to.deep.equal([
            'X',
            'Y',
            'Z'
        ]);
    });

    it('should await async inherited _initialize methods', callbackFunction => {
        const initializeExecuted = [],

            A = make({
                async _initialize () {
                    await new Promise(resolve => {
                        setTimeout(resolve, 34);
                    });

                    initializeExecuted.push('A');
                }
            }),
            B = make({
                async _initialize () {
                    await new Promise(resolve => {
                        setTimeout(resolve, 21);
                    });

                    initializeExecuted.push('B');
                }
            }),
            C = make({
                async _initialize () {
                    await new Promise(resolve => {
                        setTimeout(resolve, 13);
                    });

                    initializeExecuted.push('C');
                }
            }),
            X = make(Initializable, [
                A
            ], {
                _initialize () {
                    initializeExecuted.push('X');
                }
            }),
            Y = make(X, [
                B
            ], {
                _initialize () {
                    initializeExecuted.push('Y');
                }
            }),
            Z = make(Y, [
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
                setTimeout(resolve, 2);
            });
        };

        z.on('initializeComplete', () => {
            expect(initializeExecuted).to.deep.equal([
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

    it('should handle initialization errors', callbackFunction => {
        let capturedError,
            subscriptionExecuted = false;

        const CustomInitializable = make(Initializable, {
                _initialize () {
                    throw Error({
                        name: 'CustomInitializationError'
                    });
                }
            }),
            customInitializable = CustomInitializable(),
            domain = createDomain();

        expect(customInitializable).to.have.property('initialized', false);

        customInitializable.on('initializeError', ({
            data: {
                error
            }
        }) => {
            expect(error).to.be.an.instanceOf(Error);
            expect(error).to.have.property('name', 'CustomInitializationError');
            subscriptionExecuted = true;
            domain.enter();
        });

        domain.on('error', error => {
            capturedError = error;
            domain.exit();
        });

        setTimeout(() => {
            expect(subscriptionExecuted).to.be.true;
            expect(capturedError).to.have.property('name', 'CustomInitializationError');
            callbackFunction();
        }, 55);
    });

    it('should work with mixins', () => {
        const methodsExecuted = [],

            A = make([
                Initializable
            ], {
                _init (...args) {
                    return Reflect.apply(Initializable.prototype._init, this, args);
                },
                _initialize () {
                    methodsExecuted.push('a');
                }
            }),
            B = make([
                A
            ], {
                _init (...args) {
                    return Reflect.apply(Initializable.prototype._init, this, args);
                }
            }),
            C = make([
                B
            ], {
                _init (...args) {
                    return Reflect.apply(Initializable.prototype._init, this, args);
                },
                _initialize () {
                    methodsExecuted.push('c');
                }
            }),
            c = C();

        expect(c).not.to.be.an.instanceOf(Initializable);

        expect(c).to.have.property('initialized', true);

        expect(methodsExecuted).to.deep.equal([
            'a',
            'c'
        ]);

        c.destroy();

        expect(c.initialized).to.be.undefined;
    });
});
