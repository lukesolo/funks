'use strict';

class ServiceCall {
    constructor (key, args) {
        this.key = key;
        this.args = convertArgs(args);
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
        this.args = convertArgs(args);
    }
}

class Def {
    constructor (result) {
        this.result = convertArg(result);
    }
}

class Case {
    constructor (pred, result) {
        this.pred = pred;
        this.result = convertArg(result);
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
        this.expr = convertArg(expr);
        this.def = convertArg(def);
        this.callback = callback;
    }
}

// Values to be processed by external function
class Ext {
    constructor (handle, args) {
        this.handle = handle;
        this.args = convertArgs(args);
    }
}

const isPure = v => {
    if (v instanceof ServiceCall) {
        return false;
    } else if (v instanceof Lifted) {
        return false;
    } else if (v instanceof Sync) {
        return false;
    } else if (v instanceof Or) {
        return false;
    } else if (v instanceof Ext) {
        return false;
    } else if (v instanceof OnFail) {
        return false;
    }
    return true;
}

const isPlainObject = v => v && v.constructor && v.constructor.name === 'Object';

const convertArg = arg => {
    if (Array.isArray(arg)) {
        return syncArray(arg);
    }
    if (isPlainObject(arg)) {
        return syncObject(arg);
    }
    return arg;
};
const convertArgs = args => {
    return args.map(convertArg);
};

const liftValue = v => isPure(v) ? new Lifted(v) : v;

function lift (f) {
    if (typeof f !== 'function') {
        throw new Error(`expected argument for lift is function, got ${typeof f}`);
    }
    return (...args) => {
        const result = f(...args.map(liftValue));
        return convertArg(result);
    }
};

function sync (f) {
    if (typeof f !== 'function') {
        throw new Error(`expected argument for sync is function, got ${typeof f}`);
    }
    return (...args) => new Sync(f, args);
}

function createArray (...values) {
    return values;
}
createArray.toString = () => '[create array function]';

function createObject (keys, ...values) {
    const obj = {};
    for (let i = 0; i < keys.length; i++) {
        obj[keys[i]] = values[i];
    }
    return obj;
}
createObject.toString = () => '[create object function]';

function syncArray (arr) {
    return sync(createArray)(...arr);
}
function syncObject (obj) {
    const keys = Object.keys(obj);
    const values = keys.map(key => obj[key]);
    return sync(createObject)(keys, ...values);
}

function or (pred, result) {
    return new Or(pred, result);
};

function onFail (callback) {
    if (typeof callback !== 'function') {
        throw new Error(`expected argument for onFail is function, got ${typeof callback}`);
    }
    return (expr, def) => new OnFail(expr, def, callback);
}

function ext (handle) {
    if (typeof handle !== 'function') {
        throw new Error(`expected argument for external call is function, got ${typeof handle}`);
    }
    return (...args) => new Ext(handle, args);
};

function service (key, ...opt) {
    if (opt.length > 0) {
        // DEPRECATED
        console.log('Warning: using composite key for service call is DEPRECATED');
        key += opt.map(k => '.' + k).join('');
    }

    return (...args) => new ServiceCall(key, args);
};

const services = new Map();

const registerService = (key, value) => services.set(key, value);
const registerMap = m => m.forEach((value, key) => registerService(key, value));

const _register = (...args) => {
    if (args[0] instanceof Map) {
        return registerMap(...args);
    }
    return registerService(...args);
}

module.exports = {lift, service, sync, or, onFail, isPure, services, ext,
    // Убрать из публичных
    ServiceCall, Lifted, Sync, Or, OnFail, Ext, _register};
