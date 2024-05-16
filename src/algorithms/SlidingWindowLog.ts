import type {
    ConsumeResult,
    RateLimitAlgorithm,
    SlidingWindowLogConfig,
    SlidingWindowLogValues,
    Store,
} from "../utils/types.js";

export default class SlidingWindowLog
    implements RateLimitAlgorithm<SlidingWindowLogValues>
{
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: Store<SlidingWindowLogValues>;

    constructor(config: Required<SlidingWindowLogConfig>) {
        this.limit = config.limit;
        this.windowMs = config.windowMs;
        this.store = config.store;
    }

    public async consume(
        clientId: string,
        weight = 1,
    ): Promise<ConsumeResult<SlidingWindowLogValues>> {
        const now = Date.now();
        const clientData = await this.getUpdatedValues(clientId, now);

        if (clientData.length + weight > this.limit) {
            return { isAllowed: false, clientData };
        }
        for (let i = 0; i < weight; i++) {
            clientData.push(now);
        }
        const newClientData = await this.store.set(clientId, clientData);
        return { isAllowed: true, clientData: newClientData };
    }

    public getRemainingPoints(clientData: SlidingWindowLogValues): number {
        return clientData ? this.limit - clientData.length : this.limit;
    }

    public getResetTime(clientData: SlidingWindowLogValues): number {
        if (!clientData || !clientData.length) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor((clientData.at(-1)! - this.windowMs) / 1000);
    }

    private async getUpdatedValues(
        clientId: string,
        now: number,
    ): Promise<SlidingWindowLogValues> {
        const requests = await this.store.get(clientId);
        if (!requests) {
            return [];
        }
        let i = 0;
        for (; i < requests.length; i++) {
            if (requests[i]! + this.windowMs > now) {
                break;
            }
        }
        requests.splice(0, i);
        return requests;
    }
}
