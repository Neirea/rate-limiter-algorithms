import {
    RateLimitAlgorithm,
    SlidingWindowLogConfig,
    SlidingWindowLogValues,
    Store,
} from "../utils/types.js";

export default class SlidingWindowLog implements RateLimitAlgorithm {
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: Store<SlidingWindowLogValues>;

    constructor(config: Required<SlidingWindowLogConfig>) {
        this.limit = config.limit;
        this.windowMs = config.windowMs;
        this.store = config.store;
    }

    public async consume(clientId: string, weight = 1): Promise<boolean> {
        const now = Date.now();
        const requests = await this.getUpdatedValues(clientId, now);

        if (requests.length + weight > this.limit) {
            return false;
        }
        for (let i = 0; i < weight; i++) {
            requests.push(now);
        }
        this.store.set(clientId, requests);
        return true;
    }

    public async getRemainingPoints(clientId: string): Promise<number> {
        const requests = await this.store.get(clientId);
        return requests ? this.limit - requests.length : this.limit;
    }

    public async getResetTime(clientId: string): Promise<number> {
        const currentValues = await this.store.get(clientId);
        if (!currentValues) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor((currentValues.at(-1)! - this.windowMs) / 1000);
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
