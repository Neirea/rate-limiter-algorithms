import assert from "node:assert";
import { describe, test } from "node:test";
import RateLimiter from "../src/lib.js";

describe("Sliding Window Log algorithm", () => {
    test("should allow 3 requests per any 5000ms window", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowLog = new RateLimiter({
            algorithm: "sliding-window-logs",
            limit: 3,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 10; i++) {
            const isRequestPassing = await slidingWindowLog.consume(clientId);
            const shouldPass = i < 3 || (i > 4 && i < 8);
            assert.strictEqual(isRequestPassing, shouldPass);
            t.mock.timers.tick(1000);
        }
    });

    test("should correctly delete old timestamps", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowLog = new RateLimiter({
            algorithm: "sliding-window-logs",
            limit: 3,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 3; i++) {
            slidingWindowLog.consume(clientId);
        }
        t.mock.timers.tick(6000);
        for (let i = 0; i < 5; i++) {
            const isRequestPassing = await slidingWindowLog.consume(clientId);
            const shouldPass = true;
            assert.strictEqual(isRequestPassing, shouldPass);
            t.mock.timers.tick(2500);
        }
    });

    test("should account for request cost", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowLog = new RateLimiter({
            algorithm: "sliding-window-logs",
            limit: 5,
            windowMs: 5000,
        });

        const shouldPass = [
            true,
            true,
            true,
            false,
            true,
            false,
            true,
            true,
            true,
            false,
            true,
            false,
        ];
        const clientId = "unique_id";

        for (let i = 0; i < 12; i++) {
            const isRequestPassing = await slidingWindowLog.consume(
                clientId,
                1 + (i % 2),
            );
            assert.strictEqual(isRequestPassing, shouldPass[i]);
            t.mock.timers.tick(1000);
        }
    });
});
