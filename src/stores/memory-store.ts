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
     * Clients are moved from 'oldClients' to 'activeClients' when they are doing a request
     */
    private activeClients: Map<string, T>;
    /**
     * Time period when expired clients will be removed in milliseconds
     */
    private TTL?: number;
    /**
     * A reference to the active timer.
     */
    private interval?: NodeJS.Timeout;

    constructor() {
        this.oldClients = new Map();
        this.activeClients = new Map();
    }

    public async get(clientId: string): Promise<T | undefined> {
        const oldClient = this.oldClients.get(clientId);
        if (oldClient) {
            this.oldClients.delete(clientId);
            this.activeClients.set(clientId, oldClient);
            return oldClient;
        }
        return this.activeClients.get(clientId);
    }

    public async set(clientId: string, value: T): Promise<void> {
        this.activeClients.set(clientId, value);
    }

    public async remove(clientId: string): Promise<void> {
        this.activeClients.delete(clientId);
    }

    public async reset(): Promise<void> {
        this.oldClients.clear();
        this.activeClients.clear();
    }

    public setTTL(TTL: number): void {
        this.TTL = TTL;
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => {
            this.clearExpired();
        }, this.TTL);
    }

    public shutdown(): void {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.reset();
    }

    private clearExpired(): void {
        this.oldClients = this.activeClients;
        this.activeClients = new Map();
    }
}
