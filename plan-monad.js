'use strict';

const {lift, service, sync, iff, Lifted, Sync, ServiceCall, Iff} = require('./lib/builder');
const {walkObject} = require('./lib/visualize');

const isPromise = p => p instanceof Object && 'then' in p;

const getItem = service('item', 'get');
const getUser = service('user', 'get');

const simple = lift((userId, itemId) => {
    const item = getItem(itemId);
    const user = getUser(userId);
    const type = sync(x => x.type)(user);
    const hasType = sync((user, type) => user.type === type)(user, type);

    const good = sync(item => item.id > 0)(item);
    const eq = sync((item, user) => item.id === user.id)(item, user);
    return good;
});

// const _call = (controller, action, args) => ({services}) => services(`${controller}/${action}`, args);

/* --------------------------------------- */

const Nothing = Object.create(null);

const nodeResult = ({input}, node, result) => ({context: {input, node}, result});

// const _r = value => context => ({result: value, context});
const _r = value => () => value;

const _b = node => (deps, compute) => {
    let chain = Nothing;
    // let newContext = undefined;

    return context => {
        if (chain === Nothing) {
            // ({context: newContext, result} = m(context));
            // result = result.then(r => compute(r));
            chain = deps(context).then(d => compute(d));
        }
        return chain.then(r => {
            const result = r(context);
            context.results.set(node, result)
            return result;
        });
        // answer.then(a => context.results.set(node, a));
        // const newContext = {input: context.input, node};
        // return result.then(r => r(newContext));        
    }
};

const all = values => context => Promise.all(values.map(value => value(context)));
// const all = values => context => ({
//     context,
//     result: Promise.all(values.map(value => value(context))),
// });

const _lifted = node => {
    const index = node.value;
    return context => context.input[index];
}
// const _lifted = node => {
//     const index = node.value;
//     return context => nodeResult(context, node, context.input[index]);
// }

const _sync = (node, builder) => {
    const {f, args: unresolved} = node;
    const monads = unresolved.map(builder.next);

    return _b(node)(all(monads), results => _r(f(...results)));
}

const waitArg = context => {
    const arg = context.node.args[0];
    return {input: context.input, node: arg, result: arg(context)};
}

const _singleService = call => _b(waitArg, arg => _r(call(arg)));

const _service = (node, builder) => {
    const {name, action, args: unresolved} = node;
    const monads = unresolved.map(builder.next);
    const call = builder.getCall(name, action);

    return _b(node)(all(monads), results => _r(call(...results)));
};

/* --------------------------------------- */

const _s = new Map([
    ['item/get', id => Promise.resolve({id, type: 'Item'})],
    ['user/get', id => Promise.resolve({id, type: 'User'})],
]);

function next (node) {
    if (node instanceof Lifted) {
        return _lifted(node, this);
    }
    if (node instanceof Sync) {
        return _sync(node, this);
    }
    if (node instanceof ServiceCall) {
        return _service(node, this);
    }
    throw `тип не поддерживается: ${node}`;
}

const cache = cached => next => node => {
    if (cached.has(node)) {
        return cached.get(node);
    }

    const result = next(node);

    cached.set(node, result);
    return result;
}

const build = (comp) => {
    const builder = {
        getCall (controller, action) { return _s.get(`${controller}/${action}`) },
    };
    const cached = new Map();
    builder.next = cache(cached)(next.bind(builder));

    return builder.next(comp(0, 1, 2, 3, 4, 5, 6, 7, 8, 9));
};

const run = (plan, ...input) => {
    const context = {input, results: new Map()};
    const promise = plan(context);
    if (isPromise(promise)) {
        promise.catch(() => null).then(() => console.dir(context, {depth: null}))
        return promise;
    }
    return Promise.resolve(promise);
};

const plan = build(simple);
// console.log(plan.toString());

run(plan, 10, 20).then(console.log).catch(console.log);
