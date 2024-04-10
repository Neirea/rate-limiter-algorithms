import assert from "node:assert";
import { describe, test } from "node:test";
import { MemoryStore } from "../../src/index.js";
import { TokenBucketValues } from "../../src/utils/types.js";

describe("Memory Store", () => {
    test("Should remove all clients in 2 TTL time windows", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });

        const memoryStore = new MemoryStore<TokenBucketValues>();
        const fiveMinutes = 300_000;
        memoryStore.setTTL(fiveMinutes);

        for (let i = 0; i < 5; i++) {
            memoryStore.set(i.toString(), {
                points: 1,
                lastRefillTimeMs: Date.now(),
            });
        }

        t.mock.timers.tick(2 * fiveMinutes);

        for (let i = 0; i < 5; i++) {
            const client = await memoryStore.get(i.toString());
            assert.strictEqual(client, undefined);
        }
    });
});
