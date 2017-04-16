'use strict';

const {lift, service, sync, or, onFail, ext, _register} = require('./lib/builder');
const plan = require('./lib/plan');

module.exports = {
    plan,
    builder: {lift, service, sync, or, onFail, ext},
    register: _register,
};
