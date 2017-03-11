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

// -----------------------------------

const getPublication = service('publications', 'forItem');
const getUser = service('users', 'get');
const selectUsers = service('users', 'select');
const getBids = service('bids', 'forPublication');
const getDeletedBidsCount = service('bids', 'deletedCount');
const getNextPrice = service('bids', 'getNext');
const getSomeText = service('someText', 'for');

const mapIds = sync(xs => xs.map(x => x.id));

const guestText = lift(() => getSomeText('Guest'));
const userText = lift(id => getSomeText('User', id));
const ownerText = lift(id => getSomeText('Owner', id));

const trading = lift((itemId, userId) => {
    const publication = getPublication(itemId);
    const publicationId = sync(p => p.publicationId)(publication);
    const ownerId = sync(x => x.ownerId)(publication);

    const owner = getUser(ownerId);
    const bids = getBids(publicationId);
    const bidIds = mapIds(bids);
    const bidders = selectUsers(bidIds);
    const deletedBidsCount = getDeletedBidsCount(publicationId, userId);

    const isGuest = sync(id => id === 0)(userId);
    const isOwner = sync((userId, ownerId) => userId === ownerId)(userId, ownerId);

    const nextPrice = iff(isOwner, undefined)
        .elsee(getNextPrice(itemId));

    const text = iff(isGuest, guestText())
        .iff(isOwner, ownerText(userId))
        .elsee(userText(userId));

    return {itemId, userId, bidIds, deletedBidsCount, nextPrice, text};
});

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

const tree = trading('argument: itemId', 'argument: userId');

// walkObject(tree);
console.log(walkObject(tree));
// console.log(walkTree(tree.nextPrice));
// console.dir(tree, {depth: null});