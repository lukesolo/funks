'use strict';

const {walkObject} = require('./visualize');
const trading = require('./trading');

const tree = trading('argument: itemId', 'argument: userId');

console.log(walkObject(tree));
