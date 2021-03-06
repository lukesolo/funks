'use strict';

const {lift, service, sync, or, onFail} = require('../lib/builder');

const getPublication = service('publications.forItem');
const getUser = service('users.get');

const logOnFail = onFail(err => console.log(err));

const zero = sync(x => x === 0);

const item = lift(itemId => {
    const publication =
        or(zero(itemId), null)
        .def(getPublication(itemId));
    const ownerId = sync(x => x.ownerId)(publication);
    const owner = logOnFail(getUser(ownerId), {isEmpty: true, someField: 1});

    return {publication, owner};
});

module.exports = item;
