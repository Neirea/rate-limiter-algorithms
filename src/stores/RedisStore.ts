import type { AlgorithmValues, Store } from "../utils/types.js";

type RedisOptions = {
    rawCall: (...args: string[]) => Promise<unknown>;
    prefix?: string;
};

export default class RedisStore<T extends AlgorithmValues> implements Store<T> {
    private prefix: string;
    private rawCall: RedisOptions["rawCall"];
    private TTL: number;

    constructor(options: RedisOptions) {
        this.prefix = options.prefix ?? "rla:";
        this.rawCall = options.rawCall;
        this.TTL = 300_000;
    }

    public async get(clientId: string): Promise<T | undefined> {
        const result = (await this.rawCall(
            "GET",
            this.prefixedKey(clientId),
        )) as string;
        const parsedResult = JSON.parse(result) as T | null;
        return parsedResult ?? undefined;
    }

    public async set(clientId: string, value: T): Promise<T> {
        await this.rawCall(
            "SET",
            this.prefixedKey(clientId),
            JSON.stringify(value),
            "EX",
            this.TTL.toString(),
        );
        return value;
    }

    public async remove(clientId: string): Promise<void> {
        await this.rawCall("DEL", this.prefixedKey(clientId));
    }

    public async reset(): Promise<void> {
        const script =
            "return redis.call('del', unpack(redis.call('keys', ARGV[1])))";
        await this.rawCall("EVAL", script, "0", this.prefix + "*");
    }

    public setTTL(TTL: number): void {
        this.TTL = TTL;
    }

    private prefixedKey(key: string): string {
        return `${this.prefix}${key}`;
    }
}
