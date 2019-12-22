var _ = typeof require == 'function' ? require('underscore') : window._;

//let fromDB = "[[\"cmd_fakeKick\",[[\"rename\",\"rn\"]]]]"; //real string
let fromDB = "[[\"cmd_fakeKick\",[[\"rename\",\"rn\"]],\"cmd_everyone\",[[\"rename\",\"e\"]]]]"; //test string
let parsedDB = JSON.parse(fromDB);
//console.log(JSON.parse(parsedDB));
let parsedMap = new Map(parsedDB);

console.log(fromDB);
console.log(parsedDB);
console.log(parsedMap);

var moe = _.create(new Map(), parsedDB);
console.log(moe);
moe = _.create(new Map(), moe[0]);
console.log(moe);

let m = new Map();
return;
for (let i = 0; i < moe.length; i++) {
    if (i % 2 === 1) { // odd
    m.set(moe)
    } else { // even

    }
}

/* --- */

function type(data) {
    return ({}).toString.call(data).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}