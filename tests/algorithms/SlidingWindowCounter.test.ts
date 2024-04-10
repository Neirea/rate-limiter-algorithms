import assert from "node:assert";
import { describe, test } from "node:test";
import RateLimiter from "../../src/lib.js";

describe("Sliding Window Counter algorithm", () => {
    test("should handle 15 requests on overlapping window", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowCounter = new RateLimiter({
            algorithm: "sliding-window-counter",
            limit: 5,
            windowMs: 10_000,
        });

        const clientId = "unique_id";

        await slidingWindowCounter.consume(clientId);
        t.mock.timers.tick(5_000);

        for (let i = 0; i < 14; i++) {
            const isRequestPassing =
                await slidingWindowCounter.consume(clientId);
            const shouldPass = i < 4 || (i > 5 && i % 2 === 1);
            assert.strictEqual(isRequestPassing, shouldPass);
            t.mock.timers.tick(1000);
        }
    });

    test("should reset counters after 2 windows of time passed", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowCounter = new RateLimiter({
            algorithm: "sliding-window-counter",
            limit: 5,
            windowMs: 10_000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 10; i++) {
            await slidingWindowCounter.consume(clientId);
            t.mock.timers.tick(1000);
        }

        t.mock.timers.tick(20_000);

        assert.strictEqual(
            await slidingWindowCounter.getRemainingPoints(clientId),
            slidingWindowCounter.limit,
        );
    });
});
