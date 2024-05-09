import assert from "node:assert";
import { describe, test } from "node:test";
import SlidingWindowLog from "../../src/algorithms/SlidingWindowLog.js";
import { MemoryStore } from "../../src/index.js";

describe("Sliding Window Log algorithm", () => {
    test("should allow 3 requests per any 5000ms window", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowLog = new SlidingWindowLog({
            store: new MemoryStore(),
            limit: 3,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 10; i++) {
            const { isAllowed } = await slidingWindowLog.consume(clientId);
            const shouldPass = i < 3 || (i > 4 && i < 8);
            assert.strictEqual(isAllowed, shouldPass);
            t.mock.timers.tick(1000);
        }
    });

    test("should correctly delete old timestamps", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowLog = new SlidingWindowLog({
            store: new MemoryStore(),
            limit: 3,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 3; i++) {
            await slidingWindowLog.consume(clientId);
        }
        t.mock.timers.tick(6000);
        for (let i = 0; i < 5; i++) {
            const { isAllowed } = await slidingWindowLog.consume(clientId);
            const shouldPass = true;
            assert.strictEqual(isAllowed, shouldPass);
            t.mock.timers.tick(2500);
        }
    });

    test("should account for request weight", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const slidingWindowLog = new SlidingWindowLog({
            store: new MemoryStore(),
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
            const { isAllowed } = await slidingWindowLog.consume(
                clientId,
                1 + (i % 2),
            );
            assert.strictEqual(isAllowed, shouldPass[i]);
            t.mock.timers.tick(1000);
        }
    });
});
