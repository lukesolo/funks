'use strict';

const {lift, service, sync, or, Lifted, Sync, ServiceCall, Or} = require('./lib/builder');
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
    const text = or(eq, 'Равно')
        .or(good, 'Хорошо')
        .def(hasType);

    return text;
});

/* --------------------------------------- */

const end = value => () => value;

const chain = node => (deps, compute) => context => {
    if (context.results.has(node)) {
        return context.results.get(node);
    }

    const args = deps(context);
    if (isPromise(args)) {
        const result = args.then(a => compute(a)(context));
        context.results.set(node, result);
        result.then(r => context.results.set(node, r));
        return result;
    }

    const result = compute(args)(context);
    context.results.set(node, result);
    return result;
};

const zeroArgs = () => [];
const all = values => {
    if (values.length === 0) {
        return zeroArgs;
    }

    return context => Promise.all(values.map(value => value(context)))
};

const firstIndex = values => context => {
    const results = values.map(value => value(context));
    
    const choose = index => {
        if (index >= results.length) {
            return -1;
        }
        const result = results[index];
        if (isPromise(result)) {
            return result.then(r => r ? index : choose(index + 1));
        }
        return result ? index : choose(index + 1);
    }
    return choose(0);
}

const _lifted = node => {
    const index = node.value;
    return context => context.input[index];
}

const _sync = (node, builder, chain) => {
    const {f, args: unresolved} = node;
    const monads = unresolved.map(builder.next);

    if (monads.length === 1) {
        return chain(monads[0], result => end(f(result)));
    }

    return chain(all(monads), results => end(f(...results)));
}

const _service = (node, builder, chain) => {
    const {name, action, args: unresolved} = node;
    const call = builder.getCall(name, action);
    const monads = unresolved.map(builder.next);

    if (monads.length === 1) {
        return chain(monads[0], result => end(call(result)));
    }

    return chain(all(monads), results => end(call(...results)));
};

const _or = (node, builder, chain) => {
    const {cases} = node;
    const preds = cases.filter(c => c.pred).map(c => builder.next(c.pred));
    const results = cases.map(c => builder.next(c.result));
    const def = results.length > preds.length ? results[results.length - 1] : builder.next(undefined);

    if (preds.length === 1) {
        return chain(preds[0], pred => pred ? results[0] : def);
    }

    return chain(firstIndex(preds), index => index >= 0 ? results[index] : def);
};

/* --------------------------------------- */

const _s = new Map([
    ['item/get', id => console.log('item/get') || Promise.resolve({id, type: 'Item'})],
    ['user/get', id => Promise.resolve({id, type: 'User'})],
]);

const choose = node => {
    if (node instanceof Lifted) {
        return _lifted;
    }
    if (node instanceof Sync) {
        return _sync;
    }
    if (node instanceof ServiceCall) {
        return _service;
    }
    if (node instanceof Or) {
        return _or;
    }
    return end;
}

function next (node) {
    return choose(node)(node, this, chain(node));
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
        // promise.catch(() => null).then(() => {
        //     for (const [key, value] of context.results) {
        //         console.log(`${key.constructor.name}`);
        //         console.dir(value, {depth: null});
        //     }
        // });
        return promise;
    }
    return Promise.resolve(promise);
};

const plan = build(simple);
// console.log(plan.toString());

run(plan, 5, 2).then(console.log).catch(console.log);
run(plan, 5, 5).then(console.log).catch(console.log);
run(plan, 5, 0).then(console.log).catch(console.log);
