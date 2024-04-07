import {
    FixedWindowCounterConfig,
    FixedWindowCounterValues,
    RateLimitAlgorithm,
    Store,
} from "../utils/types.js";

export default class FixedWindowCounter implements RateLimitAlgorithm {
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: Store<FixedWindowCounterValues>;

    constructor(config: Required<FixedWindowCounterConfig>) {
        this.limit = config.limit;
        this.windowMs = config.windowMs;
        this.store = config.store;
    }

    public async consume(clientId: string, weight = 1): Promise<boolean> {
        const { points, lastWindowResetTimeMs } =
            await this.getUpdatedValues(clientId);
        if (points + weight > this.limit) {
            return false;
        }
        this.store.set(clientId, {
            points: points + weight,
            lastWindowResetTimeMs,
        });
        return true;
    }

    public async getRemainingPoints(clientId: string): Promise<number> {
        const currentValues = await this.store.get(clientId);
        if (!currentValues) {
            return 0;
        }
        return this.limit - currentValues.points;
    }

    public async getResetTime(clientId: string): Promise<number> {
        const currentValues = await this.store.get(clientId);
        if (!currentValues) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor(
            (currentValues.lastWindowResetTimeMs + this.windowMs) / 1000,
        );
    }

    private async getUpdatedValues(
        clientId: string,
    ): Promise<FixedWindowCounterValues> {
        const now = Date.now();
        const currentValues = await this.store.get(clientId);
        if (
            !currentValues ||
            now - currentValues.lastWindowResetTimeMs >= this.windowMs
        ) {
            return { points: 0, lastWindowResetTimeMs: now };
        }
        return {
            points: currentValues.points,
            lastWindowResetTimeMs: currentValues.lastWindowResetTimeMs,
        };
    }
}
