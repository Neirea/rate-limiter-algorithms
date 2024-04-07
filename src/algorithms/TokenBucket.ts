import {
    RateLimitAlgorithm,
    Store,
    TokenBucketConfig,
    TokenBucketValues,
} from "../utils/types.js";

export default class TokenBucket implements RateLimitAlgorithm {
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: Store<TokenBucketValues>;

    constructor(config: Required<TokenBucketConfig>) {
        this.limit = config.limit;
        this.store = config.store;
        this.windowMs = config.windowMs;
    }

    public async consume(clientId: string, weight = 1): Promise<boolean> {
        const { points, lastRefillTimeMs } =
            await this.getUpdatedValues(clientId);
        if (points - weight < 0) {
            return false;
        }
        this.store.set(clientId, {
            points: points - weight,
            lastRefillTimeMs,
        });
        return true;
    }

    public async getRemainingPoints(clientId: string): Promise<number> {
        const currentValues = await this.store.get(clientId);
        if (!currentValues) {
            return this.limit;
        }
        const pointsToAdd = Math.floor(
            (Date.now() - currentValues.lastRefillTimeMs) / this.windowMs,
        );

        return Math.min(currentValues.points + pointsToAdd, this.limit);
    }

    public async getResetTime(clientId: string): Promise<number> {
        const currentValues = await this.store.get(clientId);
        if (!currentValues) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor(
            (currentValues.lastRefillTimeMs + this.windowMs) / 1000,
        );
    }

    private async getUpdatedValues(
        clientId: string,
    ): Promise<TokenBucketValues> {
        const now = Date.now();
        const currentValues = await this.store.get(clientId);
        if (!currentValues) {
            return { points: this.limit, lastRefillTimeMs: now };
        }
        const {
            points: currentPoints,
            lastRefillTimeMs: currentLastRefillTimeMs,
        } = currentValues;
        const pointsToAdd = Math.floor(
            (now - currentLastRefillTimeMs) / this.windowMs,
        );

        const points = Math.min(currentPoints + pointsToAdd, this.limit);

        let lastRefillTimeMs = now;
        if (points !== this.limit) {
            lastRefillTimeMs =
                currentLastRefillTimeMs + pointsToAdd * this.windowMs;
        }
        return { points, lastRefillTimeMs };
    }
}
