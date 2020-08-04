import {Decon} from "../mod.ts"

const conc = new Decon("127.0.0.1",6379);
let msg = await conc.ping("ABC");
console.log("ABC ",msg);
msg = await conc.set("msg","300");
console.log("set ",msg);
msg = await conc.get("mk");
console.log("get ",msg);
let n = await conc.incr('msg');
console.log("msg: ", n);
