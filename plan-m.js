'use strict';

const {lift, service, sync, iff, Lifted, Sync, ServiceCall, Iff} = require('./lib/builder');
const {walkObject} = require('./lib/visualize');

// const simple = lift((userId, itemId) => {
//     const good = sync(id => id !== 0)(itemId);
//     const eq = sync((userId, itemId) => userId === itemId)(userId, itemId);
//     const text = iff(eq, 'Ид равны')
//         .iff(good, 'больше 0')
//         //.elsee(good);
//     // return {itemId, good};
//     return text;
// });

const isPromise = p => p instanceof Object && 'then' in p;

const getItem = service('item', 'get');
const getUser = service('user', 'get');

const simple = lift((userId, itemId) => {
    const item = getItem(itemId);
    const user = getUser(userId);
    const type = sync(x => x.type)(user);
    const hasType = sync((user, type) => user.type === type.a())(user, type);

    const good = sync(item => item.id > 0)(item);
    const eq = sync((item, user) => item.id === user.id)(item, user);
    return hasType;
});

const _r = value => () => value;
const _call = (controller, action, args) => ({services}) => services(`${controller}/${action}`, args);

const _b = (plan, callback) => context => {
    const result = plan(context);
    if (isPromise(result)) {
        return result.then(r => callback(r)(context));
    }

    return callback(result)(context);
} 

// const all = values => context => values.map(v => factory(v)(context));
const all = values => context => {
    const arr = values.map(v => factory(v)(context));

    if (arr.some(e => isPromise(e))) {
        return Promise.all(arr);
    }
    return arr;
};

const _lifted = ({value: index}) => ({args}) => args[index];
// const _sync = ({f, args: children}) => context => f(...all(children)(context));
const _sync = ({f, args: unresolved}) =>
    _b(all(unresolved), values =>
    _r(f(...values)));

const _service = ({name, action, args: unresolved}) =>
    _b(all(unresolved), args =>
    _call(name, action, args));

function factory (node) {
    if (node instanceof Lifted) {
        return _lifted(node);
    }
    if (node instanceof Sync) {
        return _sync(node);
    }
    if (node instanceof ServiceCall) {
        return _service(node);
    }
};

const makePlan = comp => {
    const tree = comp(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    const plan = factory(tree);
    // console.log(plan.toString());
    return plan;
};

const _s = new Map([
    ['item/get', id => Promise.resolve({id, type: 'Item'})],
    ['user/get', id => Promise.resolve({id, type: 'User'})],
]);
const services = (key, args) => {
    return _s.get(key)(...args);
}

const run = (plan, ...args) => {
    const promise = plan({args, services});
    if (promise instanceof Object && 'then' in promise) {
        return promise;
    }
    return Promise.resolve(promise);
};

const plan = makePlan(simple);

run(plan, 1, 1).then(console.log).catch(console.log);
