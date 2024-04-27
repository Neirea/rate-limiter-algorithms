import {
    ConsumeResult,
    RateLimitAlgorithm,
    SlidingWindowCounterConfig,
    SlidingWindowCounterValues,
    Store,
} from "../utils/types.js";

export default class SlidingWindowCounter
    implements RateLimitAlgorithm<SlidingWindowCounterValues>
{
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: Store<SlidingWindowCounterValues>;

    constructor(config: Required<SlidingWindowCounterConfig>) {
        this.limit = config.limit;
        this.windowMs = config.windowMs;
        this.store = config.store;
    }

    public async consume(
        clientId: string,
        weight = 1,
    ): Promise<ConsumeResult<SlidingWindowCounterValues>> {
        const now = Date.now();
        const clientData = await this.getUpdatedValues(clientId, now);
        const estimatedPoints = this.getEstimatedPoints(clientData, now);

        if (estimatedPoints + weight > this.limit) {
            return { isAllowed: false, clientData };
        }
        const newClientData = await this.store.set(clientId, {
            ...clientData,
            currPoints: clientData.currPoints + weight,
        });
        return { isAllowed: true, clientData: newClientData };
    }

    public getRemainingPoints(clientData: SlidingWindowCounterValues): number {
        const now = Date.now();
        if (!clientData || now - clientData.edgeTimeMs > 2 * this.windowMs) {
            return this.limit;
        }
        if (now - clientData.edgeTimeMs > this.windowMs) {
            return (
                this.limit -
                Math.floor(
                    clientData.currPoints *
                        ((this.windowMs - (now - clientData.edgeTimeMs)) /
                            this.windowMs),
                )
            );
        }
        return (
            this.limit - Math.floor(this.getEstimatedPoints(clientData, now))
        );
    }

    public getResetTime(clientData: SlidingWindowCounterValues): number {
        if (!clientData) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor((clientData.edgeTimeMs + this.windowMs) / 1000);
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

    private getEstimatedPoints(
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
