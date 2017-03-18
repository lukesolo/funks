'use strict';

const {ServiceCall, Lifted, Sync, Iff} = require('./builder');

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
        return `${padding}${node.name}.${node.action}\n${children.join('\n')}`;
    }
    if (node instanceof Iff) {
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
    return `${padding}${node}`;
}

const walkObject = (obj, level = 0) => {
    const padding = '  '.repeat(level);
    const strs = Object.keys(obj).map(key => `${padding}${key}:\n${walkTree(obj[key], level + 1)}`);
    return strs.join('\n\n');
}

module.exports = {walkObject};
