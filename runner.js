'use strict';

const {isPure, services, ServiceCall, Lifted, Sync, Iff} = require('./builder');

const lifted = (node, context) => Promise.resolve(node.value);

const sync = (node, context) => {
    const promises = node.args.map(a => next(a, context));
    return Promise.all(promises).then(args => node.f(...args));
};

const serviceCall = (node, context) => {
    const promises = node.args.map(a => next(a, context));
    const service = context.service(node.name, node.action);
    return Promise.all(promises).then(args => service(...args));
};

const iff = (node, context) => {
    const preds = node.cases.filter(c => c.pred)
        .map(c => next(c.pred, context));

    return Promise.all(preds).then(preds => {
        let index = preds.findIndex(p => p);
        if (index === -1) {
            index = node.cases.length - 1;
        }
        return next(node.cases[index].result, context);
    });
};

const cache = f => (node, context) => {
    if (context.p.has(node)) {
        return context.p.get(node);
    }

    const res = f(node, context);

    context.p.set(node, res);
    return res;
}

function next(node, context) {
    if (node instanceof Lifted) {
        return lifted(node, context);
    }
    if (node instanceof Sync) {
        return sync(node, context);
    }
    if (node instanceof ServiceCall) {
        return serviceCall(node, context);
    }
    if (node instanceof Iff) {
        return iff(node, context);
    }
    return node;
};

const walkObject = (node, context) => {
    const res = {};

    const promises = Object.keys(node).map(key => {
        const promise = next(node[key], context);
        return promise.then(value => res[key] = value);
    });
    return Promise.all(promises).then(() => res);
}

const run = node => {
    const context = {
        p: new Map(),
        service: (name, action) => (...args) => services.get(`${name}.${action}`)(...args),
    }
    const n = cache(next);

    if (isPure(node)) {
        return walkObject(node, context);
    }
    const result = n(node, context);
    return result;
};

module.exports = {run};
