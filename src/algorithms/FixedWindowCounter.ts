import type {
    ConsumeResult,
    FixedWindowCounterConfig,
    FixedWindowCounterValues,
    RateLimitAlgorithm,
    Store,
} from "../utils/types.js";

export default class FixedWindowCounter
    implements RateLimitAlgorithm<FixedWindowCounterValues>
{
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: Store<FixedWindowCounterValues>;

    constructor(config: Required<FixedWindowCounterConfig>) {
        this.limit = config.limit;
        this.windowMs = config.windowMs;
        this.store = config.store;
    }

    public async consume(
        clientId: string,
        weight = 1,
    ): Promise<ConsumeResult<FixedWindowCounterValues>> {
        const clientData = await this.getUpdatedValues(clientId);
        if (clientData.points + weight > this.limit) {
            return { isAllowed: false, clientData };
        }
        const newClientData = await this.store.set(clientId, {
            points: clientData.points + weight,
            lastWindowResetTimeMs: clientData.lastWindowResetTimeMs,
        });
        return { isAllowed: true, clientData: newClientData };
    }

    public getRemainingPoints(clientData: FixedWindowCounterValues): number {
        if (!clientData) {
            return 0;
        }
        return this.limit - clientData.points;
    }

    public getResetTime(clientData: FixedWindowCounterValues): number {
        if (!clientData) {
            return Math.floor(Date.now() / 1000);
        }
        return Math.floor(
            (clientData.lastWindowResetTimeMs + this.windowMs) / 1000,
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
