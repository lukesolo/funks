'use strict';

const assert = require('assert');

const {lift, service, sync, or, onFail, ext, _register} = require('../lib/builder');
const {build, run, registerExt} = require('../lib/plan');

registerExt(
    result => result.crazyCalc,
    (result, context) => Promise.resolve(`${result.value} + ${context}`)
);
_register('echo-for-ext', arg => ({value: arg, crazyCalc: true}));

const echoService = service('echo-for-ext');
const echo = build(lift(arg => echoService(arg)));

it('run with ext context', () => {
    return run.extContext('outer context')(echo, 'message').then(result => {
        assert.strictEqual(result, 'message + outer context');
    });
});
