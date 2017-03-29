'use strict';

const {_register} = require('./builder');
const {walkObject} = require('./visualize');
const trading = require('./trading');
const failure = require('./failure');
const {run} = require('./runner');

_register(new Map([
    ['publications.forItem', id => Promise.resolve({id, ownerId: 10, publicationId: 100})],
    ['bids.forPublication', () => Promise.resolve([{id: 1}, {id: 2}])],
    ['bids.deletedCount', () => Promise.resolve(3)],
    ['bids.getNext', () => Promise.resolve(5000)],
    ['users.get', id => Promise.resolve({id})],
    ['users/full.get', id => Promise.resolve({id, phone: '8913245670'})],
    ['users.select', () => Promise.resolve([{id: 15}, {id: 19}])],
    ['settings.get', () => Promise.resolve({showPhone: true})],
    ['someText.for', (role, id) => Promise.resolve(`Text for: ${role} with id: ${id}`)],
]));

// const tradingTree = trading('argument: itemId', 'argument: userId');
const failureTree = failure('argument: itemId');

// console.log(walkObject(tradingTree));
// console.log(walkObject(failureTree));
// run(trading(1, 0)).then(console.log).catch(console.log);
// run(trading(1, 10)).then(console.log).catch(console.log);
// run(trading(1, 2)).then(console.log).catch(console.log);
// run(failure(0)).then(console.log).catch(console.log);
