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

class Cas {
    constructor (pred, result) {
        this.pred = pred;
        this.result = result;
    }
}

class Iff {
    constructor (pred, result) {
        this.cases = [new Cas(pred, result)];
    }

    iff (pred, result) {
        this.cases.push(new Cas(pred, result));
        return this;
    }

    elsee (result) {
        this.cases.push(new Def(result));
        return this;
    }
}

// const curriedSync = f => (...args) => new Sync(f, args);
// const sync = (f, ...args) => args.length ? curriedSync(f)(...args) : curriedSync(f);

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
    if (v instanceof Iff) {
        return false;
    }
    return true;
}

const liftValue = v => isPure(v) ? new Lifted(v) : v;

const lift = f => (...args) => f(...args.map(liftValue));
const service = (name, action) => (...args) => new ServiceCall(name, action, args);
const sync = f => (...args) => new Sync(f, args);
const iff = (...args) => new Iff(...args);

const services = new Map();
const _register = m => m.forEach((value, key) => services.set(key, value));

module.exports = {lift, service, sync, iff, isPure, services,
    // Убрать из публичных
    ServiceCall, Lifted, Sync, Iff, _register};
