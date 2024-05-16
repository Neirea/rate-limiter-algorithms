import type { AlgorithmValues, Store } from "../utils/types.js";

export default class MemoryStore<T extends AlgorithmValues>
    implements Store<T>
{
    /**
     * 'oldClients' are retained temporarily before being removed completely based on an interval timer.
     * Clients are moved from 'activeClients' to 'oldClients' when interval timer triggers.
     * Clients are moved from 'oldClients' to 'activeClients' when they are doing a request
     */
    private oldClients: Map<string, T>;
    private activeClients: Map<string, T>;
    private TTL: number;
    private interval?: NodeJS.Timeout;

    constructor() {
        this.oldClients = new Map();
        this.activeClients = new Map();
        this.TTL = 300_000;
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

    public async set(clientId: string, value: T): Promise<T> {
        this.activeClients.set(clientId, value);
        return value;
    }

    public async remove(clientId: string): Promise<void> {
        this.oldClients.delete(clientId);
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

    public async shutdown(): Promise<void> {
        if (this.interval) {
            clearInterval(this.interval);
        }
        await this.reset();
    }

    private clearExpired(): void {
        this.oldClients = this.activeClients;
        this.activeClients = new Map();
    }
}
