import assert from "node:assert";
import { describe, test } from "node:test";
import TokenBucket from "../../src/algorithms/TokenBucket.js";
import { MemoryStore } from "../../src/index.js";

describe("Token bucket algorithm", () => {
    test("with burst of traffic and 2 tokens after refill", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const tokenBucket = new TokenBucket({
            store: new MemoryStore(),
            limit: 5,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 7; i++) {
            const { isAllowed, clientData } =
                await tokenBucket.consume(clientId);
            const shouldPass = i < 6;
            assert.strictEqual(isAllowed, shouldPass);
            const tokensLeft = i < 5 ? tokenBucket.limit - i - 1 : 0;
            assert.strictEqual(
                tokenBucket.getRemainingPoints(clientData),
                tokensLeft,
            );
            t.mock.timers.tick(1000);
        }

        const { isAllowed, clientData } = await tokenBucket.consume(clientId);
        assert.strictEqual(isAllowed, false);
        assert.strictEqual(tokenBucket.getRemainingPoints(clientData), 0);
        t.mock.timers.tick(3000);
        const lastRequest = await tokenBucket.consume(clientId);
        assert.strictEqual(lastRequest.isAllowed, true);
    });

    test("should account for weight", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const tokenBucket = new TokenBucket({
            store: new MemoryStore(),
            limit: 10,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 6; i++) {
            const { isAllowed } = await tokenBucket.consume(clientId, i + 1);
            const shouldPass = i < 4;
            assert.strictEqual(isAllowed, shouldPass);
            t.mock.timers.tick(1000);
        }

        t.mock.timers.tick(100_000);
        const { isAllowed, clientData } = await tokenBucket.consume(
            clientId,
            10,
        );
        assert.strictEqual(isAllowed, true);
        assert.strictEqual(tokenBucket.getRemainingPoints(clientData), 0);
    });

    test("should reset last refill time after bucket is full again", async (t) => {
        t.mock.timers.enable({
            apis: ["Date", "setInterval"],
            now: Date.now(),
        });
        const tokenBucket = new TokenBucket({
            store: new MemoryStore(),
            limit: 3,
            windowMs: 5000,
        });

        const clientId = "unique_id";

        for (let i = 0; i < 3; i++) {
            const { isAllowed } = await tokenBucket.consume(clientId);
            assert.strictEqual(isAllowed, true);
            t.mock.timers.tick(1000);
        }
        t.mock.timers.tick(2000 + tokenBucket.limit * tokenBucket.windowMs);
        const { clientData } = await tokenBucket.consume(clientId);
        assert.strictEqual(
            tokenBucket.getRemainingPoints(clientData),
            tokenBucket.limit - 1,
        );
    });
});
