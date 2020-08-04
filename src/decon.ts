export class DeconError extends Error {
    public constructor(name :string) {
        super(name);
    }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const CRLF = encoder.encode("\r\n");

class BinReader {
    private pcon :Promise<Deno.Conn>;
    private buf :Uint8Array;
    private pos :number;
    private len :number;

    public constructor(conc :Promise<Deno.Conn>) {
        this.pcon = conc;
        this.buf = new Uint8Array(8192);
        this.pos = 0;
        this.len = 0;
    }

    private async ensure() {
        if (this.pos >= this.len) {
            const conc = await this.pcon;
            let read = await conc.read(this.buf);
            if (read != null && read > 0) {
                this.len = read;
                this.pos = 0;
            } else {
                this.len = -1;
                this.pos = -1;
                throw new DeconError("couldn't find enough bytes");
            }
        }
    }

    public async readChar() :Promise<string> {
        await this.ensure();
        let res :number[] = [];
        res.push(this.buf[this.pos]);
        this.pos++;
        return decoder.decode(new Uint8Array(res));
    }
    
    public async readLine() :Promise<string> {
        await this.ensure();
        let tarr = [];
        while (this.buf[this.pos] != CRLF[0]) {
            tarr.push(this.buf[this.pos]);
            ++this.pos;
            await this.ensure();
        }
        this.pos++;  
        await this.ensure();
        this.pos++;
        return decoder.decode(new Uint8Array(tarr));
    }
}

class Reader {
    private binReader :BinReader;
    private str :string;

    public constructor(pcon :Promise<Deno.Conn>) {
        this.binReader = new BinReader(pcon);
        this.str = "";
    }

    public async getReply() :Promise<String | string[] | number |void> {
        let s :string = await this.binReader.readChar();
        switch (s) {
            case "+":
                return this.getStatusReply();
            case "$":
                return this.getBulkReply();
            case "*":
                return this.getMultiBulkReply();
            case ":":
                return this.intReply();
            case "-":
                return this.getErrorReply();
        }
    }

    public async getStatusReply() :Promise<string> {
        return this.binReader.readLine();
    }

    public async getBulkReply() :Promise<string> {
        let n :number = Number(await this.binReader.readLine());
        if (n == -1) {
            return "";
        }
        return this.binReader.readLine();
    }

    public async getMultiBulkReply() :Promise<string[]> {
        let n :number = Number(await this.binReader.readLine());
        let res :string[] = [];
        for (let i = 0;i < n;++i) {
            let s = await this.binReader.readChar();
            if (s !== '$') {
                throw new DeconError("wrong reply");
            }
            s = await this.getBulkReply();
            res.push(s);
        }
        return res;
    }

    public async intReply() :Promise<number> {
        return Number(await this.binReader.readLine());
    }

    public async getErrorReply() :Promise<void> {
        throw new DeconError(await this.binReader.readLine());
    }
}

class Writer {
    private pcon :Promise<Deno.Conn>;

    public constructor(pcon :Promise<Deno.Conn>) {
        this.pcon = pcon;
    }

    public async writeParms(...parms :string[]) {
        let con = await this.pcon;
        con.write(encoder.encode("*" + parms.length + "\r\n"));
        for (let i = 0;i < parms.length;++i) {
            let parr = encoder.encode(parms[i]);
            //转换成字节数组后的长度
            con.write(encoder.encode("$" + parr.length));
            con.write(CRLF);
            con.write(parr);
            con.write(CRLF);
        }
    }
}

export class Decon {
    private host :string;
    private port :number;
    private pconc :Promise<Deno.Conn>;
    private isConnect :boolean;
    private reader :Reader;
    private writer :Writer;

    public constructor(host :string,port :number) {
        this.host = host;
        this.port = port;
        this.pconc = Deno.connect({hostname:host,port:port});
        this.isConnect = true;
        this.reader = new Reader(this.pconc);
        this.writer = new Writer(this.pconc);
    }

    public close() {
        this.pconc.then(conc => conc.close());
        this.isConnect = false;
    }

    public connect() {
        if (!this.isConnect) {
            this.pconc = Deno.connect({hostname:this.host,port:this.port});
            this.isConnect = true;
        }
    }

    public async ping(msg :string) :Promise<string> {
        await this.writer.writeParms("ping", msg);
        let res = await this.reader.getReply();
        if (typeof res == 'string') {
            return res;
        }
        throw new DeconError("wrong reply type");
    }

    public async set(key :string, value :string) :Promise<string> {
        await this.writer.writeParms("set",key,value);
        let res = await this.reader.getReply();
        if (typeof res == 'string') {
            return res;
        }
        throw new DeconError("wrong reply type");
    }

    public async get(key :string) :Promise<string> {
        await this.writer.writeParms("get", key);
        let res = await this.reader.getReply();
        if (typeof res == 'string') {
            return res;
        }
        throw new DeconError("wrong reply type");
    }

    public async incr(key :string) :Promise<number> {
        await this.writer.writeParms("incr", key);
        let res = await this.reader.getReply();
        if (typeof res == 'number') {
            return res;
        }
        throw new DeconError("wrong reply type");
    }
}

