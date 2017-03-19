'use strict';

const {lift, service, sync, iff, Lifted, Sync, Iff} = require('./builder');
const {walkObject} = require('./visualize');

const simple = lift((userId, itemId) => {
    const good = sync(id => id !== 0)(itemId);
    const eq = sync((userId, itemId) => userId === itemId)(userId, itemId);
    const text = iff(eq, 'Ид равны')
        .iff(good, 'больше 0')
        //.elsee(good);
    // return {itemId, good};
    return text;
});

// console.log(walkObject(simple(1)));

const lifted = (node, parent) => {
    const index = node.value;
    return input => Promise.resolve(input[index]);
    // return args => console.log(new Error().stack) || args[index];
    // return args => console.log(new Error().stack) || args[index];
}

const synced = (node, parent) => {
    const f = node.f;
    if (node.args.length === 1) {
        const promise = next(node.args[0], node);
        return input => promise(input).then(f);
        // return args => p(args).then(arg => console.log(arg) || f(arg));
        // return args => f(p(args));
    }
    const promises = node.args.map(a => next(a, node));
    return input => Promise.all(promises.map(p => p(input))).then(args => f(...args));
    // console.log(args);
    // console.log(node, parent);
};

const _def = () => Promise.resolve(undefined);
const iffed = (node, parent) => {
    // if (node.cases.every(c => c.pred)) {
    //     throw new Error('В условной функции обязательно должно быть дефолтное значение');
    // }
    let def = _def;
    const ifCases = node.cases.filter(c => c.pred);
    const defCase = node.cases.find(c => !c.pred);
    if (defCase) {
        def = next(defCase.result);
    }

    const ifCount = ifCases.length;
    if (ifCount === 1) {
        const promise = next(ifCases[0].pred, node);
        const then = next(ifCases[0].result, node);
        return input => promise(input)
            .then(value => value ? then(input) : def(input));
    }

    const preds = ifCases.map(cas => next(cas.pred, node));
    const results = ifCases.map(cas => next(cas.result, node));
    return input => {
        const promises = preds.map(p => p(input));
        
        const choose = i => {
            if (i >= ifCount) {
                return def(input);
            }
            return promises[i].then(value => value ? results[i](input) : choose(i + 1));
        };
        return choose(0);
    }
};

const pure = (node, parent) => {
    return input => Promise.resolve(node);
}

function next(node, parent) {
    if (node instanceof Lifted) {
        return lifted(node, parent);
    }
    if (node instanceof Sync) {
        return synced(node, parent);
    }
    if (node instanceof Iff) {
        return iffed(node, parent);
    }
    return pure(node, parent);
    // if (node instanceof ServiceCall) {
    //     return serviceCall(node, context);
    // }

    // return node;
};

const plan = c => {
    const p = next(c(0, 1, 2, 3, 4, 5, 6, 7, 8, 9));
    return (...args) => p(args);
}

// console.log(next(simple(0).good));
// const run = next(simple(0).good);
const run = plan(simple);
run(5, 5).then(console.log).catch(console.log);

// Builder a -> [a -> Promise a, Context]

