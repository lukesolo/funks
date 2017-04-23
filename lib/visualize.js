'use strict';

const {ServiceCall, Lifted, Sync, Or, OnFail} = require('./builder');

const walkTree = (node, level = 0) => {
    const padding = '  '.repeat(level);
    if (node instanceof Lifted) {
        return `${padding}${node.value}`;
    }
    if (node instanceof Sync) {
        const children = node.args.map(arg => walkTree(arg, level + 1));
        return `${padding}${node.f.toString()}\n${children.join('\n')}`;
    }
    if (node instanceof ServiceCall) {
        const children = node.args.map(arg => walkTree(arg, level + 1));
        return `${padding}${node.key}\n${children.join('\n')}`;
    }
    if (node instanceof Or) {
        const len = node.cases.length;
        const children = node.cases.map((c, i) => {
            if (i === 0) {
                return `${padding}if\n${walkTree(c.pred, level + 1)}\n${padding}then\n${walkTree(c.result, level + 1)}`
            }
            if (i === len - 1) {
                return `${padding}default\n${walkTree(c.result, level + 1)}`
            }
            return `${padding}else if\n${walkTree(c.pred, level + 1)}\n${padding}then\n${walkTree(c.result, level + 1)}`
        });
        return children.join('\n');
    }
    if (node instanceof OnFail) {
        const _try = `${padding}try\n${walkTree(node.expr, level + 1)}`;
        const _catch = `${padding}onError\n${walkTree(node.callback, level + 1)}`;
        const _finally = `${padding}default\n${walkTree(node.def, level + 1)}`;
        return `${_try}\n${_catch}\n${_finally}`
    }
    if (node instanceof Function) {
        return `${padding}${node}`;
    }
    if (node instanceof Array) {
        return `${padding}${node}`;
    }
    if (node !== null && node instanceof Object) {
        return `${padding}{${Object.keys(node).join(', ')}}`;
    }
    return `${padding}${node}`;
}

const walkObject = (obj, level = 0) => {
    const padding = '  '.repeat(level);
    const strs = Object.keys(obj).map(key => `${padding}${key}:\n${walkTree(obj[key], level + 1)}`);
    return strs.join('\n\n');
}

module.exports = {walkObject};
