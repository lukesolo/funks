'use strict';

const {lift, service, sync, iff, onFail} = require('./builder');

const getPublication = service('publications', 'forItem');
const getUser = service('users', 'get');

const logOnFail = onFail(console.log);

const zero = sync(x => x === 0);

const item = lift(itemId => {
    const publication =
        iff(zero(itemId), null)
        .elsee(getPublication(itemId));
    const ownerId = sync(x => x.ownerId)(publication);
    const owner = logOnFail(getUser(ownerId), {empty: true});

    return {publication, owner};
});

module.exports = item;
