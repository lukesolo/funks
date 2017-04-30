'use strict';

const assert = require('assert');

const {lift, service, sync, or, onFail, _register} = require('../lib/builder');
const {build, run} = require('../lib/plan');

let oneArgCallCount = 0;
_register('one_arg', x => {
    oneArgCallCount++;
    return x;
});
const oneArg = service('one_arg');
const singleArgument = lift(value => [oneArg(value), oneArg(value)]);
const runOneArg = run.bind(null, build(singleArgument));

let multiArgCallCount = 0;
_register('multi_arg', (...args) => {
    multiArgCallCount++;
    return args;
});
const multiArg = service('multi_arg');
const multiArgument = lift((a, b, c, d) => [multiArg(a, b, c, d), multiArg(a, b, c, d)]);
const runMultiArg = run.bind(null, build(multiArgument));

describe('Service call', () => {
    describe('with same argument', () => {
        it('should be cached', () => {
            return runOneArg(42).then(result => {
                assert.deepStrictEqual([42, 42], result);
                assert.strictEqual(1, oneArgCallCount);
            });
        });
    });

    describe('with same multiple arguments', () => {
        it('should be cached', () => {
            return runMultiArg(1, '2', [3], {4: 4}).then(result => {
                assert.deepStrictEqual([[1, '2', [3], {4: 4}], [1, '2', [3], {4: 4}]], result);
                assert.strictEqual(1, oneArgCallCount);
            });
        });
    });
});
