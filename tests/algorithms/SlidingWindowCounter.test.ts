import assert from "node:assert";
import { describe, test } from "node:test";
import SlidingWindowCounter from "../../src/algorithms/SlidingWindowCounter.js";
import { MemoryStore } from "../../src/index.js";

describe("Sliding Window Counter algorithm", () => {
    test("should handle 15 requests on overlapping window", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowCounter = new SlidingWindowCounter({
            store: new MemoryStore(),
            limit: 5,
            windowMs: 10_000,
        });

        const clientId = "unique_id";

        await slidingWindowCounter.consume(clientId);
        t.mock.timers.tick(5_000);

        for (let i = 0; i < 14; i++) {
            const { isAllowed } = await slidingWindowCounter.consume(clientId);
            const shouldPass = i < 4 || (i > 5 && i % 2 === 1);
            assert.strictEqual(isAllowed, shouldPass);
            t.mock.timers.tick(1000);
        }
    });

    test("should reset counters after 2 windows of time passed", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowCounter = new SlidingWindowCounter({
            store: new MemoryStore(),
            limit: 5,
            windowMs: 10_000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 10; i++) {
            await slidingWindowCounter.consume(clientId);
            t.mock.timers.tick(1000);
        }

        t.mock.timers.tick(20_000);

        // empty request to get current clientData
        const { clientData } = await slidingWindowCounter.consume(clientId, 0);
        assert.strictEqual(
            slidingWindowCounter.getRemainingPoints(clientData),
            slidingWindowCounter.limit,
        );
    });
});
