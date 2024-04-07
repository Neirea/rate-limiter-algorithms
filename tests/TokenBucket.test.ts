import assert from "node:assert";
import { describe, test } from "node:test";
import RateLimiter from "../src/lib.js";

describe("Token bucket algorithm", () => {
    test("with burst of traffic and 2 tokens after refill", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const tokenBucket = new RateLimiter({
            algorithm: "token-bucket",
            limit: 5,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 7; i++) {
            const isRequestPassing = await tokenBucket.consume(clientId);
            const shouldPass = i < 6;
            assert.strictEqual(isRequestPassing, shouldPass);
            const tokensLeft = i < 5 ? tokenBucket.limit - i - 1 : 0;
            const remainingPoints =
                await tokenBucket.getRemainingPoints(clientId);
            assert.strictEqual(remainingPoints, tokensLeft);
            t.mock.timers.tick(1000);
        }

        assert.strictEqual(await tokenBucket.consume(clientId), false);
        assert.strictEqual(await tokenBucket.getRemainingPoints(clientId), 0);
        t.mock.timers.tick(3000);
        assert.strictEqual(await tokenBucket.consume(clientId), true);
    });

    test("should account for cost", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const tokenBucket = new RateLimiter({
            algorithm: "token-bucket",
            limit: 10,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 6; i++) {
            const isRequestPassing = await tokenBucket.consume(clientId, i + 1);
            const shouldPass = i < 4;
            assert.strictEqual(isRequestPassing, shouldPass);
            t.mock.timers.tick(1000);
        }

        t.mock.timers.tick(100_000);
        assert.strictEqual(await tokenBucket.consume(clientId, 10), true);
        assert.strictEqual(await tokenBucket.getRemainingPoints(clientId), 0);
    });

    test("should reset last refill time after bucket is full again", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const tokenBucket = new RateLimiter({
            algorithm: "token-bucket",
            limit: 3,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 3; i++) {
            const isRequestPassing = await tokenBucket.consume(clientId);
            assert.strictEqual(isRequestPassing, true);
            t.mock.timers.tick(1000);
        }
        t.mock.timers.tick(2000 + tokenBucket.limit * tokenBucket.windowMs);
        await tokenBucket.consume(clientId);
        assert.strictEqual(
            await tokenBucket.getRemainingPoints(clientId),
            tokenBucket.limit - 1,
        );
    });
});
