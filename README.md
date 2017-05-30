# funks

Asynchronous model builder in functional style.

## API

### lift

Is a function that takes pure function which describes process of creating independent block of data.

### service
```
service :: key -> (...args) -> ServiceCall
```
Service is a curried function, that takes key and arguments and after that returns object, which contains information about particular service call. 

### sync
```
sync :: fn -> (...args) -> SyncComputation
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
