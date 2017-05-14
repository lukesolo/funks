'use strict';

const {Lifted, Sync, ServiceCall, Or, OnFail, Ext, services, isPure} = require('./builder');

const config = {
    _validateServices: false,
    validateServices (yes = true) {
        config._validateServices = yes;
    },
};

const isPromise = p => p !== null && p !== undefined && typeof p.then === 'function';

const end = value => () => value;

class ServiceCallsCache {
    constructor () {
        this._cache = new Map();
    }

    getSync (call, args, calc) {
        const cache = this._cache;
        const key = this._getKey(call, args);
        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = calc();
        cache.set(key, result);
        if (isPromise(result)) {
            result.then(r => cache.set(key, r));
        }
        return result;
    }

    getAsync (call, argsP, calc) {
        return argsP.then(args => this.getSync(call, args, calc));
    }

    _getKey (call, args) {
        return call.key + ':' + JSON.stringify(args);
    }
}

const chain = node => (deps, compute) => context => {
    if (context.results.has(node)) {
        return context.results.get(node);
    }

    const args = deps(context);
    const promised = isPromise(args);
    const calc = promised
        ? () => args.then(a => compute(a)(context))
        : () => compute(args)(context);

    if (node instanceof ServiceCall) {
        return promised
            ? context.serviceCallsCache.getAsync(node, args, calc)
            : context.serviceCallsCache.getSync(node, args, calc);
    }

    const result = calc();
    context.results.set(node, result);
    if (isPromise(result)) {
        result.then(r => context.results.set(node, r));
    }
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

const convertError = err => err instanceof Error ? err : new Error(err);
const recover = expr => context => {
    try {
        const result = expr(context);
        if (isPromise(result)) {
            return result.catch(convertError);
        }
        return result;
    } catch (err) {
        return convertError(err);
    }
}

const parallel = (monads, f, chain) => {
    if (monads.length === 1) {
        return chain(monads[0], result => end(f(result)));
    }

    return chain(all(monads), results => end(f(...results)));
};

const _lifted = node => {
    const index = node.value;
    return context => context.input[index];
}

const _sync = (node, builder, chain) => {
    const {f, args: unresolved} = node;
    const monads = unresolved.map(builder.next);

    return parallel(monads, f, chain);
}

const _service = (node, builder, chain) => {
    const {key, args: unresolved} = node;
    const call = builder.getCall(key);
    const monads = unresolved.map(builder.next);

    return chain(all(monads), args => {
        const result = call(...args);
        console.log(result);
        if (isPromise(result)) {
            return end(result);
        }
        return context => {
            console.log(context);
            return handleExt(result, context.ext);
        }
    });
        // chain(call(...args)))
    // return parallel(monads, call, chain);
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

const _onFail = (node, builder, chain) => {
    const {callback} = node;
    const expr = builder.next(node.expr);
    const def = builder.next(node.def);

    return chain(recover(expr), result => {
        if (result instanceof Error) {
            callback(result);
            return def;
        }
        return end(result);
    });
};

const exts = [];
const handleExt = (value, context) => {
    const handler = exts.find(ext => ext.canHandle(value));
    if (!handler) {
        throw new Error(`cannot find handler for value: ${value}`);
    }
    return handler.handle(value, context);
};

const _onExt = (node, builder, chain) => {
    const {handle, args: unresolved} = node;
    const monads = unresolved.map(builder.next);

    return parallel(monads, (...args) => handleExt(handle(...args)), chain);
};

const _onPure = (node, builder, chain) => end(node);

const choose = node => {
    if (node instanceof Lifted) {
        return _lifted;
    } else if (node instanceof Sync) {
        return _sync;
    } else if (node instanceof ServiceCall) {
        return _service;
    } else if (node instanceof Or) {
        return _or;
    } else if (node instanceof OnFail) {
        return _onFail;
    } else if (node instanceof Ext) {
        return _onExt;
    }
    return _onPure;
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


const build = comp => {
    const builder = {
        getCall (key) {
            if (config._validateServices && !services.has(key)) {
                throw new Error(`Service "${key}" is not registered`);
            }
            return services.get(key);
        },
    };
    const cached = new Map();
    builder.next = cache(cached)(next.bind(builder));

    const top = comp(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    return builder.next(top);
};

const _run = additionalContext => (plan, ...input) => {
    const context = {
        input,
        results: new Map(),
        serviceCallsCache: new ServiceCallsCache(),
    };

    if (additionalContext) {
        Object.assign(context, additionalContext);
    }

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

const run = _run();
run.extContext = context => _run({ext: context});

const registerExt = (canHandle, handle) => exts.push({canHandle, handle});

module.exports = {build, run, registerExt, config};
