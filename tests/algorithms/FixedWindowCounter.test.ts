import assert from "node:assert";
import { describe, test } from "node:test";
import RateLimiter from "../../src/lib.js";
import FixedWindowCounter from "../../src/algorithms/FixedWindowCounter.js";
import { MemoryStore } from "../../src/index.js";

describe("Fixed Window Counter algorithm", () => {
    test("should overlap 2 windows to effectively double the limit", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const fixedWindowCounter = new FixedWindowCounter({
            store: new MemoryStore(),
            limit: 3,
            windowMs: 10_000,
        });

        const clientId = "unique_id";
        await fixedWindowCounter.consume(clientId);
        t.mock.timers.tick(5_000);

        for (let i = 0; i < 9; i++) {
            const { isAllowed } = await fixedWindowCounter.consume(clientId);
            const shouldPass = i < 2 || (i > 4 && i < 8);
            assert.strictEqual(isAllowed, shouldPass);
            t.mock.timers.tick(1000);
        }
    });
});
