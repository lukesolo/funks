'use strict';

const {lift, service, sync, iff, Lifted, Sync, Iff} = require('./lib/builder');
const {walkObject} = require('./lib/visualize');

// const simple = lift((userId, itemId) => {
//     const good = sync(id => id !== 0)(itemId);
//     const eq = sync((userId, itemId) => userId === itemId)(userId, itemId);
//     const text = iff(eq, 'Ид равны')
//         .iff(good, 'больше 0')
//         //.elsee(good);
//     // return {itemId, good};
//     return text;
// });

const simple = lift((userId, itemId) => {
    const good = sync(id => id !== 0)(itemId);
    const eq = sync((userId, itemId) => userId === itemId)(userId, itemId);
    return eq;
});

const _r = value => () => value;

const _b = (plan, callback) => context => {
    const result = plan(context);
    const next = callback(result);
    return next(context);
} 

const all = values => context => values.map(v => factory(v)(context));

const _lifted = ({value: index}) => ({args}) => args[index];
// const _sync = ({f, args: children}) => context => f(...all(children)(context));
const _sync = ({f, args: children}) =>
    _b(all(children), values =>
    _r(f(...values)));

function factory (node) {
    if (node instanceof Lifted) {
        return _lifted(node);
    }
    if (node instanceof Sync) {
        return _sync(node);
    }
};

const makePlan = comp => {
    const tree = comp(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    const plan = factory(tree);
    // console.log(plan.toString());
    return plan;
};

const run = (plan, ...args) => {
    const promise = plan({args});
    if (promise instanceof Object && 'then' in promise) {
        return promise;
    }
    return Promise.resolve(promise);
};

const plan = makePlan(simple);

run(plan, 1, 2).then(console.log);
