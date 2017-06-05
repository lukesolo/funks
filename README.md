# funks

Asynchronous model builder in functional style.

## API

### lift

The function *lift* takes pure function which describes process of creating independent block of data.
For example:
```javascript
const getUser = service('users.get');
const selectGoods = service('goods.selectByUser');
const selectCategoies = service('categoies.select');

const getCategoryIds = sync(arr => arr.map(x => x.categoryId));

const userGoods = lift(userId => {
    const user = getUser(userId);
    const goods = selectGoods(userId);
    const categoryIds = getCategoryIds(goods);
    const categories = selectCategoies(categoryIds);

    return {user, goods, categories};
});
```

All nondeterministic functions should be wrapped in *sync* function. For example:
```javascript
const getStatsUntil = service('stats.getUntil');

const someStats = lift(() => {
    // In this instance "now" will be captured once,
    // and for every call of "someStats" function getStatsUntil would get the same date.
    const now = new Date();
    return getStatsUntil(now);
});

const someStats2 = lift(() => {
    // In this instance "now" will be calculated for every call of "someStats2"
    const now = sync(() => new Date());
    return getStatsUntil(now);
});
```

### service
```
service :: key -> *... -> ServiceCall a
```
Service is a curried function, that takes key and arguments and after that returns object, which contains information about particular service call. 

### sync
```
sync :: (*... -> a) -> *... -> Sync a
```
Sync is a curried function, that firstly takes synchronous function then takes arguments and returns object, which describes non async computation.

### or
```
or :: (pred, result) -> Or
```
Or is a function that takes predicate and result, which would be returned if predicate would be *true*, and returns object *Or* that can chain multiple conditions with results. In the end of the chain default value may be declared. If default value isn't decalred result would be *undefined*.

Examples:
```javascript
const balloon =
    or(isRed, redBalloon(size))
    .or(isBlue, blueBalloon(size))
    .def(whiteBalloon(size));

// White balloon will be returned only if conditions "isRed" and "isBlue" will be false.

const valueOrUndefined = or(exists, create());
```

### ext
```
ext :: (*... -> NotPromise a) -> *... -> Ext a
```
Takes function which doesn't return promise and should calculated with alternative way.
For example if you use coroutines based on generators.
```javascript
const genEcho = function *(value) {
    yield 'simulating calculation';
    return value;
};

const extEcho = ext(genEcho);

lift(value => {
    const result = extEcho(value);
    return sync(r => `Server respond: ${r}`)(result);
});
```

External handlers should be added using function *registerExt*.
For example:
```javascript
const {registerExt} = require('funks').plan;
const co = require('co');

const genConstructor = (function *() {})().constructor;

const coHandle = value => co(value);
const coCanHandle = value => value && value.constructor === genConstructor;

registerExt(coCanHandle, coHandle);
```
