import FixedWindowCounter from "./algorithms/FixedWindowCounter.js";
import SlidingWindowCounter from "./algorithms/SlidingWindowCounter.js";
import SlidingWindowLog from "./algorithms/SlidingWindowLog.js";
import TokenBucket from "./algorithms/TokenBucket.js";
import MemoryStore from "./stores/MemoryStore.js";
import type {
    Algorithm,
    AlgorithmValues,
    ConfigOptions,
    ConsumeResult,
    RateLimitAlgorithm,
    ToStore,
} from "./utils/types.js";

export default class RateLimiter
    implements RateLimitAlgorithm<AlgorithmValues>
{
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly store: ToStore<AlgorithmValues>;
    public consume: (
        clientId: string,
        weight?: number,
    ) => Promise<ConsumeResult<AlgorithmValues>>;

    private getRemainingPoints: (clientData: AlgorithmValues) => number;
    private getResetTime: (clientData: AlgorithmValues) => number;

    /**
     * @constructor
     * @param {ConfigOptions} config - Rate limiter config options
     */
    constructor(config: ConfigOptions) {
        const populatedConfig = this.setDefaults(config);
        this.validateConfig(populatedConfig);

        const algorithm = this.getAlgorithm(populatedConfig);
        this.limit = algorithm.limit;
        this.windowMs = algorithm.windowMs;
        this.store = algorithm.store;
        this.consume = (
            clientId: string,
            weight = 1,
        ): Promise<ConsumeResult<AlgorithmValues>> => {
            this.checkForInvalidClientId(clientId);
            return algorithm.consume(clientId, weight);
        };

        type HeadersDataFunction = (clientData: AlgorithmValues) => number;

        this.getRemainingPoints = (
            algorithm.getRemainingPoints as HeadersDataFunction
        ).bind(algorithm);
        this.getResetTime = (
            algorithm.getResetTime as HeadersDataFunction
        ).bind(algorithm);
    }
    /**
     * Get rate limit headers for a client.
     * @param {AlgorithmValues} clientData - Retrieved data for a client
     * @returns {[string,string][]} - An array of rate limit headers in pairs of [name,value]
     */
    public getHeaders(clientData: AlgorithmValues): [string, string][] {
        const limit: [string, string] = [
            "X-RateLimit-Limit",
            this.limit.toString(),
        ];
        const remaining: [string, string] = [
            "X-RateLimit-Remaining",
            this.getRemainingPoints(clientData).toString(),
        ];
        const reset: [string, string] = [
            "X-RateLimit-Reset",
            this.getResetTime(clientData).toString(),
        ];
        return [limit, remaining, reset];
    }

    private setDefaults(config: ConfigOptions): Required<ConfigOptions> {
        const newConfig = Object.assign({} as Required<ConfigOptions>, config);

        let TTL = 2 * newConfig.windowMs;
        if (newConfig.algorithm === "token-bucket") {
            TTL *= newConfig.limit;
        }
        newConfig.store = newConfig.store || new MemoryStore();
        newConfig.store.setTTL(TTL);
        return newConfig;
    }

    private getAlgorithm(config: Required<ConfigOptions>): Algorithm {
        switch (config.algorithm) {
            case "token-bucket":
                return new TokenBucket(config);
            case "sliding-window-counter":
                return new SlidingWindowCounter(config);
            case "sliding-window-logs":
                return new SlidingWindowLog(config);
            case "fixed-window-counter":
                return new FixedWindowCounter(config);
        }
    }

    private validateConfig(config: ConfigOptions): void {
        if (config.limit < 1 || !Number.isInteger(config.limit)) {
            throw new Error("Limit must be a positive integer");
        }
        if (config.windowMs < 1 || !Number.isInteger(config.windowMs)) {
            throw new Error("Window time must be a positive integer");
        }
    }

    private checkForInvalidClientId(clientId: string): void {
        if (clientId === undefined) {
            throw new Error(
                "An undefined 'clientId' was detected. This might indicate a misconfiguration or the connection being destroyed prematurely.",
            );
        }
    }
}
