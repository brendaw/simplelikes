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
- `POST /likes/batch` — returns counts for multiple slugs at once
- CORS whitelist — only your domain can call the API
- Rate limiting — 10 requests/min per IP
- Slug validation — prevents path traversal and abuse
- Anonymous — no login, no user data stored
- Portable — runs on Cloudflare Workers, Fly.io, or any Node.js host
- Client script included — drop-in `examples/likes.js` for any static site

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

### POST /likes/batch

Returns counts for multiple slugs in a single request. Useful for list pages (home, archive, category) where many items are shown at once.

```bash
curl -X POST https://simplelikes.workers.dev/likes/batch \
  -H "Content-Type: application/json" \
  -d '{"slugs":["hello-world","my-post","note-1"]}'
```

```json
{"slugs":{"hello-world":42,"my-post":7,"note-1":0}}
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

#### Prerequisites

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Log in to your Cloudflare account:
   ```bash
   wrangler login
   ```

   This opens your browser to authorize Wrangler. The token is saved locally.

#### Setup

1. Create the D1 databases:
   ```bash
   wrangler d1 create simplelikes
   wrangler d1 create simplelikes-staging
   ```

   Note the `database_id` output for each — you'll need it in the next step.

2. Copy `wrangler.toml.example` to `wrangler.toml` and fill in the database IDs.

3. Apply the schema:
   ```bash
   wrangler d1 execute simplelikes --file=src/db/schema.sql --remote
   wrangler d1 execute simplelikes-staging --file=src/db/schema.sql --remote
   ```

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

## Client-side usage

See [`examples/likes.js`](examples/likes.js) for a ready-to-use client script.

```html
<button class="like-btn" data-slug="hello-world">
  <span data-counter>0</span> likes
</button>

<script src="likes.js"></script>
<script>
  new LikesClient({ apiUrl: "https://simplelikes.workers.dev" });
</script>
```

The script automatically:
- Loads all like counts on page load via batch endpoint
- Increments and updates the DOM on click
- Prevents duplicates via localStorage
- Adds `.liked` class to already-liked buttons

## Project structure

```
simplelikes/
├── src/
│   ├── index.ts           Worker handler (GET, POST, batch)
│   ├── db/schema.sql      D1 schema
│   └── utils/
│       ├── cors.ts        CORS whitelist + security headers
│       ├── rate-limit.ts  Rate limiting per IP
│       └── validate.ts    Slug validation
├── examples/
│   └── likes.js           Client-side integration example
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
