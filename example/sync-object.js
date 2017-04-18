'use strict';

const {lift, sync} = require('../lib/builder');
const {build, run} = require('../lib/plan');

const comp = lift((a, b) => {
    const sum = sync(([x, y]) => x + y)([a, b]);
    const mul = sync(({x, y}) => x * y)({x: a, y: b});
    return {sum, mul};
});

const planned = build(comp);
run(planned, 2, 3).then(console.log, console.log);
