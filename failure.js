'use strict';

const {lift, service, sync, iff, onFail} = require('./builder');

const getPublication = service('publications', 'forItem');
const getUser = service('users', 'get');

const logOnFail = onFail(console.log);

const item = lift((itemId) => {
    const publication = getPublication(itemId);
    const ownerId = sync(x => x.ownerId)(publication);
    const owner = logOnFail(getUser(ownerId), {myDefaultValue: 1});

    return {publication, owner};
});
