import {Decon} from "../mod.ts"

const conc = new Decon("127.0.0.1",6379);
conc.ping("你好").then(msg => console.log(msg));
conc.set("msg","200").then(msg => console.log(msg));
console.log(new TextEncoder().encode("你好"));