# Rate Limiter Algorithms

Library that provides different algorithms to perform rate limiting.

![NPM Version](https://img.shields.io/npm/v/rate-limiter-algorithms)
![NPM Downloads](https://img.shields.io/npm/dm/rate-limiter-algorithms)
[![LICENSE](https://img.shields.io/badge/licence-MIT-green)
](LICENSE)

## Example with Node.js

```ts
import { createServer } from "node:http";
import RateLimiter from "rate-limiter-algorithms";

const limiter = new RateLimiter({
    algorithm: "token-bucket",
    limit: 5,
    windowMs: 5000,
});

const server = createServer(async (req, res) => {
    const ip = req.socket.remoteAddress || "any unique key";

    try {
        const isAllowed = await limiter.consume(ip);

        // set rate limiting headers
        const headers = await limiter.getHeaders(ip);
        for (const header of headers) {
            res.setHeader(header[0], header[1]);
        }

        if (!isAllowed) {
            res.writeHead(429, "Too many requests");
            res.end("Failure");
            return;
        }
        res.end("Success");
    } catch (error) {
        console.error("Error in rate limiting:", error);
    }
});

server.listen(3000, "127.0.0.1", () => {
    console.log("Listening on 127.0.0.1:3000");
});
```

## Config

| Option      | Type     | Explanation                                                                                     |
| ----------- | -------- | ----------------------------------------------------------------------------------------------- |
| `algorithm` | `string` | Values: `token-bucket`, `fixed-window-counter`, `sliding-window-logs`, `sliding-window-counter` |
| `windowMs`  | `number` | Duration of time in milliseconds when algorithm updates its counter.                            |
| `limit`     | `number` | Maximum amount of points that client can consume                                                |
| `store`     | `Store`  | Store which contains clients data based on chosen algorithm. Defaults to Memory Store           |

## Date Stores

The rate limiter comes with a built-in memory store. Any store can be used that follows the same interface

## License

All code and documentation are (c) 2024 [Eugene Shumilin](https://github.com/Neirea) and released under the [MIT License](LICENSE)
