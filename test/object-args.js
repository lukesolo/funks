'use strict';

const assert = require('assert');

const {lift, service, sync, or, onFail, _register} = require('../lib/builder');
const {build, run} = require('../lib/plan');

_register('object-args', x => Promise.resolve(x));

const id = sync(x => x);
const fail = sync(x => { throw new Error(x); });
const echoService = service('object-args');

const liftArrayExample = build(lift((value1, value2) => [value1, value2]));
const syncArrayExample = build(lift((value1, value2) => id([value1, value2])));
const serviceArrayExample = build(lift((value1, value2) => echoService([value1, value2])));

const orArrayExample = build(lift((value1, value2) => or(true, [value1, value2])));
const defArrayExample = build(lift((value1, value2) =>
    or(false, false).def([value1, value2])));

const onFailArrayExample = build(lift((value1, value2) =>
    onFail(x => null)(fail(), [value1, value2])));

const liftObjectExample = build(lift((value1, value2) => ({value1, value2})));
const syncObjectExample = build(lift((value1, value2) => id({value1, value2})));
const serviceObjectExample = build(lift((value1, value2) => echoService({value1, value2})));

const orObjectExample = build(lift((value1, value2) => or(true, {value1, value2})));
const defObjectExample = build(lift((value1, value2) =>
    or(false, false).def({value1, value2})));

const onFailObjectExample = build(lift((value1, value2) =>
    onFail(x => null)(fail(), {value1, value2})));


describe('"lift" with result', () => {
    describe('of array type', () => {
        it('should be calculated', () => {
            return run(liftArrayExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, [1, 2]));
        });
    });

    describe('of object type', () => {
        it('should be calculated', () => {
            return run(liftObjectExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, {value1: 1, value2: 2}));
        });
    });
});

describe('On object of arguments', () => {
    describe('with array type', () => {
        it('"sync" should be calculated', () => {
            return run(syncArrayExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, [1, 2]));
        });

        it('"service" should be calculated', () => {
            return run(serviceArrayExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, [1, 2]));
        });

        it('"or" should be calculated', () => {
            return run(orArrayExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, [1, 2]));
        });

        it('"def" should be calculated', () => {
            return run(defArrayExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, [1, 2]));
        });

        it('"onFail" should be calculated', () => {
            return run(onFailArrayExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, [1, 2]));
        });
    });

    describe('with plain object type', () => {
        it('"sync" should be calculated', () => {
            return run(syncObjectExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, {value1: 1, value2: 2}));
        });

        it('"service" should be calculated', () => {
            return run(serviceObjectExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, {value1: 1, value2: 2}));
        });

        it('"or" should be calculated', () => {
            return run(orObjectExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, {value1: 1, value2: 2}));
        });

        it('"def" should be calculated', () => {
            return run(defObjectExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, {value1: 1, value2: 2}));
        });

        it('"onFail" should be calculated', () => {
            return run(onFailObjectExample, 1, 2)
                .then(result => assert.deepStrictEqual(result, {value1: 1, value2: 2}));
        });
    });
});
