export class DeconError extends Error {
    public constructor(name :string) {
        super(name);
    }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class Decon {
    private host :string;
    private port :number;
    private pconc :Promise<Deno.Conn>;
    private isConnect :boolean;

    public constructor(host :string,port :number) {
        this.host = host;
        this.port = port;
        this.pconc = Deno.connect({hostname:host,port:port});
        this.isConnect = true;
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
        const conc = await this.pconc;
        await conc.write(encoder.encode("ping " + msg + "\r\n"));
        const buf = new Uint8Array(1024);
        await conc.read(buf);
        return decoder.decode(buf);
    }
}

