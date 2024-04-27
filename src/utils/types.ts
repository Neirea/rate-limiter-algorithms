export interface RateLimitAlgorithm<T extends AlgorithmValues> {
    /**
     * Maximum amount of points that client can consume
     */
    limit: number;
    /**
     * Duration of time in milliseconds when algorithm updates its counter
     */
    windowMs: number;
    /**
     * Store which contains clients data based on chosen algorithm
     */
    store: ToStore<T>;
    /**
     * Consume points from a client's bucket.
     * @async
     * @param {string} clientId - The identifier for a client
     * @param {number} [weight=1] - Amount of points to consume per request.  Defaults to 1
     * @returns {Promise<boolean>} - Whether the client is allowed to proceed with the request.
     */
    consume: (clientId: string, weight?: number) => Promise<ConsumeResult<T>>;
}

export type ConsumeResult<T extends AlgorithmValues> = {
    /**
     * Is client allowed to proceed with request
     */
    isAllowed: boolean;
    /**
     * An array of rate limit headers in pairs of [name,value]
     */
    clientData: T;
};

export interface Store<T extends AlgorithmValues> {
    /**
     * Gets client data from a store
     * @async
     * @param {string} clientId - The identifier for a client
     * @returns {Promise<T | undefined>} - Client data from a store
     */
    get: (clientId: string) => Promise<T | undefined>;
    /**
     * Saves client data in a store
     * @async
     * @param {string} clientId - The identifier for a client
     * @returns {Promise<T>} - Current client data
     */
    set: (clientId: string, value: T) => Promise<T>;
    /**
     * Deletes client data from a store
     * @async
     * @param {string} clientId - The identifier for a client
     */
    remove: (clientId: string) => Promise<void>;
    /**
     * Resets all clients data in a store
     * @async
     */
    reset: () => Promise<void>;
    /**
     * Sets TTL - time period when expired clients will be removed in milliseconds
     */
    setTTL: (TTL: number) => void;
    /**
     * Clean shutdown for the store
     */
    shutdown: () => Promise<void>;
}

export type ToStore<T> = T extends AlgorithmValues ? Store<T> : never;

export type AlgorithmOptions<T extends AlgorithmValues> = {
    /**
     * Maximum amount of points that client can consume
     */
    limit: number;
    /**
     * Duration of time in milliseconds when algorithm updates its counter
     */
    windowMs: number;
    /**
     * Store which contains clients data based on chosen algorithm
     */
    store?: Store<T>;
};

export type TokenBucketValues = {
    /**
     * Current number of points remaining to consume
     */
    points: number;
    /**
     * Time in milliseconds when token bucket was last refilled
     */
    lastRefillTimeMs: number;
};

/**
 * Queue of timestamps ordered from lowest to highest
 */
export type SlidingWindowLogValues = number[];

export type SlidingWindowCounterValues = {
    /**
     * Points from previous window
     */
    prevPoints: number;
    /**
     * Points from current window
     */
    currPoints: number;
    /**
     * Time in milliseconds which separates previous and current windows
     */
    edgeTimeMs: number;
};

export type FixedWindowCounterValues = {
    /**
     * Current number of points consumed
     */
    points: number;
    /**
     * Time in milliseconds when  window was updated
     */
    lastWindowResetTimeMs: number;
};

export type AlgorithmValues =
    | TokenBucketValues
    | SlidingWindowLogValues
    | SlidingWindowCounterValues
    | FixedWindowCounterValues;

export type TokenBucketConfig = AlgorithmOptions<TokenBucketValues>;
export type SlidingWindowLogConfig = AlgorithmOptions<SlidingWindowLogValues>;
export type SlidingWindowCounterConfig =
    AlgorithmOptions<SlidingWindowCounterValues>;
export type FixedWindowCounterConfig =
    AlgorithmOptions<FixedWindowCounterValues>;

export type TokenBucketOptions = {
    /**
     * Token bucket algorithm
     */
    algorithm: "token-bucket";
} & TokenBucketConfig;

export type SlidingWindowCounterOptions = {
    /**
     * Sliding window counter algorithm
     */
    algorithm: "sliding-window-counter";
} & SlidingWindowCounterConfig;

export type SlidingWindowLogsOptions = {
    /**
     * Sliding window logs algorithm
     */
    algorithm: "sliding-window-logs";
} & SlidingWindowLogConfig;

export type FixedWindowCounterOptions = {
    /**
     * Fixed window counter algorithm
     */
    algorithm: "fixed-window-counter";
} & FixedWindowCounterConfig;

/**
 * @type {ConfigOptions} config
 * @property {string} algorithm - Algorithm type
 * @property {number} limit - Maximum amount of points client can consume
 * @property {number} windowMs - Duration of time in milliseconds when algorithm updates its counter
 * @property {Store | undefined} store - Store which contains clients data based on chosen algorithm
 */
export type ConfigOptions =
    | TokenBucketOptions
    | SlidingWindowCounterOptions
    | SlidingWindowLogsOptions
    | FixedWindowCounterOptions;
