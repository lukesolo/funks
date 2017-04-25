'use strict';

const assert = require('assert');

const {lift, service, sync, or, onFail} = require('../lib/builder');
const {build, run} = require('../lib/plan');

const ignoreOnFail = onFail(() => null);

const example = lift(value => {
    const good = sync(x => x)(value);
    const bad = sync(x => { throw new Error(x); })(value);

    const first = ignoreOnFail([good, bad], 1);
    const second = ignoreOnFail({good, bad}, 2);

    return [first, second];
});

const comp = build(example);
const runner = run.bind(null, comp);

describe('OnFail', () => {
    describe('array of', () => {
        it('should be calculated', () => {
            return runner('arg')
                .then(result => assert.deepStrictEqual(result, [1, 2]))
        });
    });
});
