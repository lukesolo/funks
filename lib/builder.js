'use strict';

class ServiceCall {
    constructor (name, action, args) {
        this.name = name;
        this.action = action;
        this.args = args;
    }
}

class Lifted {
    constructor (value) {
        this.value = value;
    }
}

// или Map?
class Sync {
    constructor (f, args) {
        this.f = f;
        this.args = args;
    }
}

class Def {
    constructor (result) {
        this.result = result;
    }
}

class Case {
    constructor (pred, result) {
        this.pred = pred;
        this.result = result;
    }
}

class Or {
    constructor (pred, result) {
        this.cases = [new Case(pred, result)];
    }

    or (pred, result) {
        this.cases.push(new Case(pred, result));
        return this;
    }

    def (result) {
        this.cases.push(new Def(result));
        return this;
    }
}

class OnFail {
    constructor (expr, def, callback) {
        this.expr = expr;
        this.def = def;
        this.callback = callback;
    }
}

// Values to be processed by external function
class Ext {
    constructor (handle, args) {
        this.handle = handle;
        this.args = args;
    }
}

const isPure = v => {
    if (v instanceof ServiceCall) {
        return false;
    }
    if (v instanceof Lifted) {
        return false;
    }
    if (v instanceof Sync) {
        return false;
    }
    if (v instanceof Or) {
        return false;
    }
    if (v instanceof Ext) {
        return false;
    }
    return true;
}

const liftValue = v => isPure(v) ? new Lifted(v) : v;

const lift = f => (...args) => f(...args.map(liftValue));
const service = (name, action) => (...args) => new ServiceCall(name, action, args);
const sync = f => (...args) => new Sync(f, args);
const or = (...args) => new Or(...args);
const onFail = callback => (expr, def) => new OnFail(expr, def, callback);
const ext = handle => (...args) => new Ext(handle, args);

const services = new Map();
const _register = m => m.forEach((value, key) => services.set(key, value));

module.exports = {lift, service, sync, or, onFail, isPure, services, ext,
    // Убрать из публичных
    ServiceCall, Lifted, Sync, Or, OnFail, Ext, _register};
