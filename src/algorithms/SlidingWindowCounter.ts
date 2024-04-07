import MemoryStore from "../stores/memory-store.js";
import {
    RateLimitAlgorithm,
    SlidingWindowCounterConfig,
    SlidingWindowCounterValues,
    Store,
} from "../utils/types.js";

export default class SlidingWindowCounter implements RateLimitAlgorithm {
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: Store<SlidingWindowCounterValues>;

    constructor(config: Required<SlidingWindowCounterConfig>) {
        this.limit = config.limit;
        this.windowMs = config.windowMs;
        this.store = config.store;
    }

    public async consume(clientId: string, weight = 1): Promise<boolean> {
        const now = Date.now();
        const values = await this.getUpdatedValues(clientId, now);
        const estimatedPoints = this.calculateEstimatedPoints(values, now);

        if (estimatedPoints + weight > this.limit) {
            return false;
        }
        this.store.set(clientId, {
            ...values,
            currPoints: values.currPoints + weight,
        });
        return true;
    }

    public async getRemainingPoints(clientId: string): Promise<number> {
        const now = Date.now();
        const currentValues = await this.store.get(clientId);
        if (
            !currentValues ||
            now - currentValues.edgeTimeMs > 2 * this.windowMs
        ) {
            return this.limit;
        }
        if (now - currentValues.edgeTimeMs > this.windowMs) {
            return (
                this.limit -
                Math.floor(
                    currentValues.currPoints *
                        ((this.windowMs - (now - currentValues.edgeTimeMs)) /
                            this.windowMs),
                )
            );
        }
        return (
            this.limit -
            Math.floor(this.calculateEstimatedPoints(currentValues, now))
        );
    }

    public async getResetTime(clientId: string): Promise<number> {
        const currentValues = await this.store.get(clientId);
        if (!currentValues) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor((currentValues.edgeTimeMs + this.windowMs) / 1000);
    }

    private async getUpdatedValues(
        clientId: string,
        now: number,
    ): Promise<SlidingWindowCounterValues> {
        const currentValues = await this.store.get(clientId);
        if (
            !currentValues ||
            now - currentValues.edgeTimeMs > 2 * this.windowMs
        ) {
            return { prevPoints: 0, currPoints: 0, edgeTimeMs: now };
        }
        const { currPoints, edgeTimeMs } = currentValues;
        if (now - edgeTimeMs > this.windowMs) {
            return {
                edgeTimeMs: edgeTimeMs + this.windowMs,
                prevPoints: currPoints,
                currPoints: 0,
            };
        }
        return currentValues;
    }

    private calculateEstimatedPoints(
        values: SlidingWindowCounterValues,
        now: number,
    ): number {
        return (
            values.currPoints +
            values.prevPoints *
                ((this.windowMs - (now - values.edgeTimeMs)) / this.windowMs)
        );
    }
}
