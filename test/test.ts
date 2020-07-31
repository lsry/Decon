import {Decon} from "../mod.ts"

const conc = new Decon("127.0.0.1",6379);
conc.ping("hello").then(msg => console.log(msg));