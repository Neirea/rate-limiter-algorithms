import type {
    ConsumeResult,
    RateLimitAlgorithm,
    Store,
    TokenBucketConfig,
    TokenBucketValues,
} from "../utils/types.js";

export default class TokenBucket
    implements RateLimitAlgorithm<TokenBucketValues>
{
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: Store<TokenBucketValues>;

    constructor(config: Required<TokenBucketConfig>) {
        this.limit = config.limit;
        this.store = config.store;
        this.windowMs = config.windowMs;
    }

    public async consume(
        clientId: string,
        weight = 1,
    ): Promise<ConsumeResult<TokenBucketValues>> {
        const clientData = await this.getUpdatedValues(clientId);
        if (clientData.points - weight < 0) {
            return { isAllowed: false, clientData };
        }
        const newClientData = await this.store.set(clientId, {
            points: clientData.points - weight,
            lastRefillTimeMs: clientData.lastRefillTimeMs,
        });
        return { isAllowed: true, clientData: newClientData };
    }

    public getRemainingPoints(clientData: TokenBucketValues): number {
        if (!clientData) {
            return this.limit;
        }
        const pointsToAdd = Math.floor(
            (Date.now() - clientData.lastRefillTimeMs) / this.windowMs,
        );

        return Math.min(clientData.points + pointsToAdd, this.limit);
    }

    public getResetTime(clientData: TokenBucketValues): number {
        if (!clientData) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor((clientData.lastRefillTimeMs + this.windowMs) / 1000);
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
