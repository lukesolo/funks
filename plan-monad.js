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
        // .def(type);

    return text;
});

/* --------------------------------------- */

// const Nothing = Object.create(null);

const _r = value => () => value;

const _b = node => (deps, compute) => {
    let computation = undefined;
    let chain = undefined;

    return context => {
        const chaining = comp => {
            const result = comp(context);
            context.results.set(node, result)
            return result;
        }

        if (computation === undefined) {
            const args = deps(context);
            if (isPromise(args)) {
                computation = args.then(a => compute(a));
                chain = comp => comp.then(chaining);
            } else {
                computation = compute(args);
                chain = chaining;
            }
        }
        return chain(computation);     
    }
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

const _sync = (node, builder) => {
    const {f, args: unresolved} = node;
    const monads = unresolved.map(builder.next);

    if (monads.length === 1) {
        return _b(node)(monads[0], result => _r(f(result)));
    }

    return _b(node)(all(monads), results => _r(f(...results)));
}

const _service = (node, builder) => {
    const {name, action, args: unresolved} = node;
    const call = builder.getCall(name, action);
    const monads = unresolved.map(builder.next);

    if (monads.length === 1) {
        return _b(node)(monads[0], result => _r(call(result)));
    }

    return _b(node)(all(monads), results => _r(call(...results)));
};

const _or = (node, builder) => {
    const {cases} = node;
    const preds = cases.filter(c => c.pred).map(c => builder.next(c.pred));
    const results = cases.map(c => builder.next(c.result));
    const def = results.length > preds.length ? results[results.length - 1] : builder.next(undefined);

    return _b(node)(firstIndex(preds), index => index === -1 ? def : results[index]);
};

/* --------------------------------------- */

const _s = new Map([
    ['item/get', id => Promise.resolve({id, type: 'Item'})],
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
    return _r;
}

function next (node) {
    return choose(node)(node, this);
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

run(plan, 5, 0).then(console.log).catch(console.log);