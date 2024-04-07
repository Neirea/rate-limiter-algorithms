import { AlgorithmValues, Store } from "../utils/types.js";

export default class MemoryStore<T extends AlgorithmValues>
    implements Store<T>
{
    /**
     * Map of clients that have been removed from the active list.
     * These clients are retained temporarily before being removed completely.
     */
    private oldClients: Map<string, T>;
    /**
     * Map of currently active clients.
     * Clients are moved from 'oldClients' to 'activeClients' when they are refreshed or updated.
     */
    private activeClients: Map<string, T>;
    /**
     * A reference to the active timer.
     */
    private interval: NodeJS.Timeout;
    /**
     * Time period when expired clients will be removed in milliseconds
     */
    private TTL: number;
    /**
     * @constructor
     * @param {number} [TTL=300_000] - Time period when expired clients will be removed in milliseconds. Defaults to 5 min
     */
    constructor(TTL: number = 300_000) {
        this.oldClients = new Map();
        this.activeClients = new Map();
        this.TTL = TTL;
        this.interval = setInterval(() => {
            this.clearExpired();
        }, this.TTL);
    }

    public async get(clientId: string): Promise<T | undefined> {
        return (
            this.activeClients.get(clientId) ?? this.oldClients.get(clientId)
        );
    }

    public async set(clientId: string, value: T): Promise<void> {
        this.oldClients.delete(clientId);
        this.activeClients.set(clientId, value);
    }

    public async remove(clientId: string): Promise<void> {
        this.activeClients.delete(clientId);
    }

    public async reset(): Promise<void> {
        this.oldClients.clear();
        this.activeClients.clear();
        clearInterval(this.interval);

        this.interval = setInterval(() => {
            this.clearExpired();
        }, this.TTL);
    }

    private clearExpired(): void {
        this.oldClients = this.activeClients;
        this.activeClients = new Map();
    }
}
