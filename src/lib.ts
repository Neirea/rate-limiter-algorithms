import FixedWindowCounter from "./algorithms/FixedWindowCounter.js";
import SlidingWindowCounter from "./algorithms/SlidingWindowCounter.js";
import SlidingWindowLog from "./algorithms/SlidingWindowLog.js";
import TokenBucket from "./algorithms/TokenBucket.js";
import MemoryStore from "./stores/memory-store.js";
import {
    AlgorithmValues,
    ConfigOptions,
    RateLimitAlgorithm,
    ToStore,
} from "./utils/types.js";

export default class RateLimiter implements RateLimitAlgorithm {
    public limit: number;
    public windowMs: number;
    public store: ToStore<AlgorithmValues>;
    public consume: (clientId: string, weight?: number) => Promise<boolean>;
    public getRemainingPoints: (clientId: string) => Promise<number>;
    public getResetTime: (clientId: string) => Promise<number>;

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
        this.consume = (clientId: string, weight?: number) => {
            this.checkForInvalidClientId(clientId);
            return algorithm.consume(clientId, weight);
        };
        this.getRemainingPoints = algorithm.getRemainingPoints.bind(algorithm);
        this.getResetTime = algorithm.getResetTime.bind(algorithm);
    }

    /**
     * Get rate limit headers for a client.
     * @async
     * @param {string} clientId - The identifier for a client
     * @returns {Promise<[string,string][]>} - An array of rate limit headers in pairs of [name,value]
     */
    public async getHeaders(clientId: string): Promise<[string, string][]> {
        const limit: [string, string] = [
            "X-RateLimit-Limit",
            this.limit.toString(),
        ];
        const remaining: [string, string] = [
            "X-RateLimit-Remaining",
            (await this.getRemainingPoints(clientId)).toString(),
        ];
        const reset: [string, string] = [
            "X-RateLimit-Reset",
            (await this.getResetTime(clientId)).toString(),
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

    private getAlgorithm(config: Required<ConfigOptions>) {
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

    private validateConfig(config: ConfigOptions) {
        if (config.limit < 1 || !Number.isInteger(config.limit)) {
            throw new Error("Limit must be a positive integer");
        }
        if (config.windowMs < 1 || !Number.isInteger(config.windowMs)) {
            throw new Error("Window time must be a positive integer");
        }
    }

    private checkForInvalidClientId(clientId: string) {
        if (clientId === undefined) {
            throw new Error(
                "An undefined 'clientId' was detected. This might indicate a misconfiguration or the connection being destroyed prematurely.",
            );
        }
    }
}
