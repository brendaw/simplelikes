<p align="center">
  <img src="https://badgen.net/github/license/brendaw/simplelikes">
  <img src="https://badgen.net/badge/status/active/green">
  <img src="https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-F38020?logo=cloudflare&logoColor=white">
  <a href="https://github.com/brendaw/simplelikes/actions/workflows/deploy.yml"><img alt="Deploy" src="https://github.com/brendaw/simplelikes/actions/workflows/deploy.yml/badge.svg"></a>
</p>

# simplelikes

A minimal, standalone likes counter API. Drop-in anonymous likes for any static site.

## Features

- `GET /likes/:slug` — returns current count
- `POST /likes/:slug` — increments count (with dedup per visitor)
- CORS whitelist — only your domain can call the API
- Rate limiting — 10 requests/min per IP
- Slug validation — prevents path traversal and abuse
- Anonymous — no login, no user data stored
- Portable — runs on Cloudflare Workers, Fly.io, or any Node.js host

## Quick start

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:8787`.

```bash
curl http://localhost:8787/likes/hello-world
# {"slug":"hello-world","count":0}

curl -X POST http://localhost:8787/likes/hello-world \
  -H "X-Visitor-Id: test-visitor"
# {"slug":"hello-world","count":1}
```

## API

### GET /likes/:slug

Returns the current like count for a slug.

```json
{"slug":"hello-world","count":42}
```

### POST /likes/:slug

Increments the count and records the visitor. Requires `X-Visitor-Id` header (a hash of User-Agent + IP, generated client-side). Returns `alreadyLiked: true` if the visitor already liked this slug.

```json
{"slug":"hello-world","count":43,"alreadyLiked":false}
```

### Errors

| Status | Reason |
|---|---|
| 400 | Invalid slug or missing `X-Visitor-Id` |
| 405 | Method not allowed |
| 429 | Rate limit exceeded |

## Security

simplelikes is designed with defense in depth:

| Layer | Mechanism |
|---|---|
| CORS | Only origins in `ALLOWED_ORIGINS` env var can call from a browser |
| Rate limit | 10 requests per minute per IP |
| Slug validation | Regex-restricted: `[a-z0-9/-]`, max 200 chars |
| Visitor dedup | `likes_visitors` table prevents double-counting per slug + visitor |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` |

## Deployment

### Cloudflare Workers + D1 (recommended)

1. Create the D1 database:
   ```bash
   npx wrangler d1 create simplelikes
   ```

2. Apply the schema:
   ```bash
   npx wrangler d1 execute simplelikes --file=src/db/schema.sql
   ```

3. Copy `wrangler.toml.example` to `wrangler.toml` and fill in the database ID.

4. Deploy:
   ```bash
   npm run deploy
   ```

### Other platforms

simplelikes uses [Hono](https://hono.dev/) as the router, making it portable to any platform that supports JavaScript runtimes. See the [Hono deployment docs](https://hono.dev/docs/#deploy) for Fly.io, Deno, Bun, and more.

## Configuration

| Env var | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://williambrendaw.com` | Comma-separated list of allowed CORS origins |
| `D1_DATABASE_ID` | — | Cloudflare D1 database ID |

## Project structure

```
simplelikes/
├── src/
│   ├── index.ts           Worker handler
│   ├── db/schema.sql      D1 schema
│   └── utils/
│       ├── cors.ts        CORS whitelist + security headers
│       ├── rate-limit.ts  Rate limiting per IP
│       └── validate.ts    Slug validation
├── test/
│   └── likes.test.ts
├── .github/workflows/
│   ├── deploy.yml         Staging on push, production on tag
│   └── release.yml        GitHub Release on tag
├── wrangler.toml          CF Workers config
└── package.json
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow. All contributions are welcome.

## License

[MIT](LICENSE) — William Brendaw, 2026.
