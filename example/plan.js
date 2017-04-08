'use strict';

const {lift, service, sync, or, onFail, _register} = require('../lib/builder');
const {build, run} = require('../lib/plan');

const getItem = service('item', 'get');
const getUser = service('user', 'get');

const logOnFail = onFail(err => console.log(err));

const simple = lift((userId, itemId) => {
    const magicUserId = logOnFail(sync(id => {throw id})(userId), userId);

    const item = getItem(itemId);
    const user = getUser(magicUserId);
    const type = sync(x => x.type)(user);
    const hasType = sync((user, type) => user.type === type)(user, type);

    const good = sync(item => {
        if (item.id >= 100) {
            throw 'Больше 100';
        }
        return item.id > 0;
    })(item);
    
    const eq = sync((item, user) => item.id === user.id)(item, user);
    const text = or(eq, 'Равно')
        .or(logOnFail(good), 'Хорошо')
        .def(hasType);

    return text;
});

/* --------------------------------------- */

_register(new Map([
    ['item.get', id => Promise.resolve({id, type: 'Item'})],
    ['user.get', id => Promise.resolve({id, type: 'User'})],
]));

const plan = build(simple);

run(plan, 5, 2).then(console.log).catch(console.log);
run(plan, 5, 5).then(console.log).catch(console.log);
run(plan, 5, 0).then(console.log).catch(console.log);
run(plan, 5, 1000).then(console.log).catch(console.log);
