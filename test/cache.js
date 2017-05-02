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

_register('same_arg_a', x => `${x}_a`);
_register('same_arg_b', x => `${x}_b`);
const sameArg = lift(x => [service('same_arg_a')(x), service('same_arg_b')(x)]);
const runSameArg = run.bind(null, build(sameArg));

describe('Service call', () => {
    it('with same argument should be cached', () => {
        return runOneArg(42).then(result => {
            assert.deepStrictEqual([42, 42], result);
            assert.strictEqual(1, oneArgCallCount);
        });
    });

    it('with same multiple arguments should be cached', () => {
        return runMultiArg(1, '2', [3], {4: 4}).then(result => {
            assert.deepStrictEqual([[1, '2', [3], {4: 4}], [1, '2', [3], {4: 4}]], result);
            assert.strictEqual(1, oneArgCallCount);
        });
    });
    
    describe('to different services', () => {
        it('with same argument should be different', () => {
            return runSameArg('arg').then(result => {
                assert.deepStrictEqual(['arg_a', 'arg_b'], result);
            });
        });
    });
});
