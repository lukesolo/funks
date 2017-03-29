'use strict';

const {lift, service, sync, or} = require('../lib/builder');

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

    const nextPrice = or(isOwner, undefined)
        .def(getNextPrice(itemId));

    const text = or(isGuest, guestText())
        .or(isOwner, ownerText(userId))
        .def(userText(userId));

    return {itemId, userId, bidIds, deletedBidsCount, nextPrice, text};
});

module.exports = trading;
