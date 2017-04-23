'use strict';

const {lift, service, _register} = require('../lib/builder');
const {build, run} = require('../lib/plan');

_register(new Map([
    ['users.get', id => Promise.resolve({id})],
]));

const getUser = service('users.get');

const user = lift(getUser);

const create = build(user);
run(create, 5).then(console.log).catch(console.log);
