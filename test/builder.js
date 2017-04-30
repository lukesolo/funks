'use strict';

const assert = require('assert');

const {isPure, ServiceCall, Lifted, Sync, Or, OnFail, Ext,
    service, _register} = require('../lib/builder');

describe('helper "isPure"', () => {
    describe('for all builder elements', () => {
        it('should return false', () => {
            assert.strictEqual(isPure(new ServiceCall), false);
            assert.strictEqual(isPure(new Lifted), false);
            assert.strictEqual(isPure(new Sync), false);
            assert.strictEqual(isPure(new Or), false);
            assert.strictEqual(isPure(new OnFail), false);
            assert.strictEqual(isPure(new Ext), false);
        });
    });

    describe('for all other values', () => {
        it('should return true', () => {
            assert.strictEqual(isPure(undefined), true);
            assert.strictEqual(isPure(null), true);
            assert.strictEqual(isPure(false), true);
            assert.strictEqual(isPure(0), true);
            assert.strictEqual(isPure(''), true);
            assert.strictEqual(isPure([]), true);
            assert.strictEqual(isPure({}), true);
        });
    });
});

describe('function "_register"', () => {
    describe('with key and value args', () => {
        it('should register', () => {
            _register('with key and value args', x => x);
            const call = service('with key and value args');
            assert.ok(call);
        });
    });

    describe('with map', () => {
        it('should register', () => {
            _register(new Map([
                ['with map', x => x],
            ]));
            const call = service('with map');
            assert.ok(call);
        });
    });
});