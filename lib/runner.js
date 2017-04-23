'use strict';

const {isPure, services, ServiceCall, Lifted, Sync, Or, OnFail} = require('./builder');

const lifted = (node, context) => Promise.resolve(node.value);

const sync = (node, context) => {
    const promises = node.args.map(a => next(a, context));
    return Promise.all(promises).then(args => node.f(...args));
};

const serviceCall = (node, context) => {
    const promises = node.args.map(a => next(a, context));
    const service = context.service(node.key);
    return Promise.all(promises).then(args => service(...args));
};

const or = (node, context) => {
    const ors = node.cases.filter(c => c.pred);
    const preds = ors.map(c => next(c.pred, context));
    const orCount = ors.length;

    const chain = index => {
        if (index >= orCount) {
            return next(node.cases[index].result, context);
        }
        return preds[index].then(pred => pred
            ? next(node.cases[index].result, context)
            : chain(index + 1));
    }
    return chain(0);
};

const onFail = (node, context) => {
    const promise = next(node.expr, context);
    return promise.catch(err => {
        node.callback(err);
        return node.def;
    });
};

const _next = (node, context) => {
    if (node instanceof Lifted) {
        return lifted(node, context);
    }
    if (node instanceof Sync) {
        return sync(node, context);
    }
    if (node instanceof ServiceCall) {
        return serviceCall(node, context);
    }
    if (node instanceof Or) {
        return or(node, context);
    }
    if (node instanceof OnFail) {
        return onFail(node, context);
    }
    return node;
};

function next(node, context) {
    if (isPure(node)) {
        return _next(node, context);
    }

    if (context.p.has(node)) {
        return context.p.get(node);
    }

    const res = _next(node, context);

    context.p.set(node, res);
    return res;
}

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
        service: key => (...args) => services.get(key)(...args),
    }

    if (isPure(node)) {
        return walkObject(node, context);
    }
    return next(node, context);
};

module.exports = {run};
