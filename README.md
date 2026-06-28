<p align="center">
  <img src="https://badgen.net/github/license/brendaw/simplelikes">
  <img src="https://badgen.net/badge/status/active/green">
  <img src="https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-F38020?logo=cloudflare&logoColor=white">
  <a href="https://github.com/brendaw/simplelikes/actions/workflows/build.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/brendaw/simplelikes/build.yml?branch=main&label=Build"></a>
  <a href="https://github.com/brendaw/simplelikes/actions/workflows/deploy.yml"><img alt="Staging" src="https://img.shields.io/github/actions/workflow/status/brendaw/simplelikes/deploy.yml?branch=main&label=Staging"></a>
  <a href="https://github.com/brendaw/simplelikes/actions/workflows/deploy.yml"><img alt="Production" src="https://img.shields.io/github/actions/workflow/status/brendaw/simplelikes/deploy.yml?label=Production"></a>
  <a href="https://github.com/brendaw/simplelikes/issues"><img alt="Issues" src="https://badgen.net/github/open-issues/brendaw/simplelikes"></a>
</p>

# simplelikes

A minimal, standalone likes counter API. Drop-in anonymous likes for any static site.

## Features

- `GET /likes/:slug` — returns current count
- `POST /likes/:slug` — increments count (with dedup per visitor)
- `POST /likes/batch` — returns counts for multiple slugs at once
- CORS whitelist — only your domain can call the API
- Rate limiting — per-IP (10 req/min) + global safeguard (500 GET/min, 50 POST/min)
- Slug validation — prevents path traversal and abuse
- Anonymous — no login, no user data stored ([privacy policy](PRIVACY.md))
- Cloudflare native — runs on Cloudflare Workers + D1, no external dependencies
- Client script included — drop-in `<simple-likes>` custom element in `examples/simple-likes.js`

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

The dev server starts at `http://localhost:8787`. No Cloudflare account needed — a local SQLite database is created automatically.

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

Toggles the like for a visitor. Requires `X-Visitor-Id` header (a hash of User-Agent + IP, generated client-side). If the visitor hasn't liked this slug yet, it increments the count. If they already liked it, it decrements and removes their visitor record. Returns `liked: true` after a like, `liked: false` after an unlike.

```json
{"slug":"hello-world","count":43,"liked":true}
```

### POST /likes/batch

Returns counts for multiple slugs in a single request. A batch **read** operation — no likes are created, only fetched.

**Use cases:**
- **Home page** — show like counts for the latest 5 posts, 3 notes, and 5 curated links in one call
- **Archive/category pages** — load counts for all items in a listing without N individual requests
- **Sidebar widgets** — "most liked" or "trending" widgets that need counts for multiple slugs

```bash
curl -X POST https://likes.yourdomain.com/likes/batch \
  -H "Content-Type: application/json" \
  -d '{"slugs":["hello-world","my-post","note-1"]}'
```

```json
{"slugs":{"hello-world":42,"my-post":7,"note-1":0}}
```

**Design note:** This endpoint uses `POST` instead of `GET` because it carries a JSON body with the list of slugs. `GET` with a request body has no defined semantics per RFC 9110 §9.3.1 and may be rejected by proxies/CDNs. The `POST`-for-read pattern is the industry standard for batch reads — the same approach used by Elasticsearch (`POST /_search`), GraphQL (`POST /graphql`), and OData (`POST /$batch`). Despite using `POST`, this is a **read operation** for rate limiting purposes.

### Errors

| Status | Reason |
|---|---|
| 400 | Invalid slug or missing `X-Visitor-Id` |
| 405 | Method not allowed |
| 429 | Rate limit exceeded (includes `Retry-After` header) |

### Caching

Read responses are cached at the edge using the **Cloudflare Cache API** to reduce D1 reads and improve latency.

| Endpoint | Cache TTL | Cache key |
|---|---|---|
| `GET /likes/:slug` | 60s | Request URL |
| `POST /likes/batch` | 30s | SHA-256 hash of sorted slugs |

- Only **200 OK** responses are cached — errors and 4xx pass through
- On cache hit, the response is returned instantly without querying D1
- On cache miss, the response is stored and served with `Cache-Control: public, max-age=<TTL>`
- The cache is **per-datacenter** — each Cloudflare edge location maintains its own copy; the first request after a write from a new region may still see stale data for up to the TTL
- New endpoints only need to call `cache.wrap(request, ttl, fetchFn)` — see `src/utils/cache.ts`
- **CORS headers are applied after cache retrieval**, not baked into cached responses — this guarantees every request gets `Access-Control-Allow-Origin` matching its own `Origin` header, regardless of cache state

## Privacy

simplelikes is **anonymous by design**: no IPs, User-Agents, cookies, or tracking data are stored. The only persisted data is the slug identifier and an opaque visitor hash.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy, data collection table, and a suggested disclosure snippet for site owners.

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure policy.

simplelikes is designed with defense in depth:

| Layer | Mechanism |
|---|---|
| CORS | Only origins in `ALLOWED_ORIGINS` env var can call from a browser |
| Per-IP rate limit | 10 requests per minute per IP — primary defense against individual abuse |
| Global rate limit | 500 GET/min, 50 POST/min — secondary layer protecting D1 free tier quota from coordinated attacks |
| Slug validation | Regex-restricted: `[a-z0-9/-]`, max 200 chars |
| Visitor dedup | `likes_visitors` table prevents double-counting per slug + visitor |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` |

## Deployment

### Cloudflare Workers + D1 (recommended)

#### One-command setup

```bash
npm run setup
```

This auto-detects your D1 databases, generates `wrangler.toml` with real IDs, and applies the schema to remote databases.

#### Manual setup

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Log in to your Cloudflare account:
   ```bash
   wrangler login
   ```

3. Create the D1 databases:
   ```bash
   wrangler d1 create simplelikes
   wrangler d1 create simplelikes-staging
   ```

4. Run setup:
   ```bash
   npm run setup
   ```

5. Deploy:
   ```bash
   npm run deploy
   ```

### VPS / standalone (Node.js)

simplelikes can also run as a standalone Node.js server using `better-sqlite3`:

```bash
npm install
npm run serve
```

The server starts at `http://localhost:3000` with an auto-created SQLite database at `./data/likes.db`.

> `better-sqlite3` is an **optional dependency** — Cloudflare Workers deploys do not install it. Only install when self-hosting.

Unlike `npm run dev` (which loads `.env` automatically via Wrangler), `npm run serve` reads environment variables directly from the process. Set them in your shell or process manager:

```bash
PORT=3000 DB_PATH=./data/likes.db ALLOWED_ORIGINS=https://example.com npm run serve
```

#### Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DB_PATH` | `./data/likes.db` | SQLite database file path |
| `ALLOWED_ORIGINS` | — | Comma-separated list of allowed CORS origins |

These can also be added to `.env` for local testing (see [`.env.example`](.env.example)).

#### Process management

For production VPS deployments, use a process manager like `pm2`:

```bash
npm install -g pm2
pm2 start npm --name simplelikes -- run serve
```

Set environment variables in the process manager config (`ecosystem.config.js` for pm2) or via your systemd service file.

## Configuration

### Environment variables

| Env var | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:8787` | Comma-separated list of allowed CORS origins |
| `INTEGRATION_TEST_SECRET` | — | Secret for `X-Integration-Test` header to bypass rate limits in integration tests |

> `ALLOWED_ORIGINS` defaults to the local Wrangler dev server. For deployed workers, override via `wrangler.toml [vars]` or Cloudflare dashboard. In CI, set the `ALLOWED_ORIGINS` GitHub Secret for the CORS integration test to pass.

### Local configuration

Both `wrangler.toml` and `.env` are gitignored. Start from the examples:

```bash
cp .env.example .env
cp wrangler.toml.example wrangler.toml
```

The `wrangler.toml` uses `__PLACEHOLDER__` variables:
- `__STAGING_DATABASE_ID__` / `__PRODUCTION_DATABASE_ID__` — replaced by `scripts/setup.sh`
- `__INTEGRATION_TEST_SECRET__` / `__ALLOWED_ORIGINS__` — replaced by CI (`deploy.yml`) or by `scripts/setup.sh` (reads from `.env` if available)

For local dev, no Cloudflare account is required — a local SQLite database is used and `__ALLOWED_ORIGINS__` defaults to `http://localhost:8787`.

For Cloudflare deployment, run `npm run setup` to auto-detect databases, generate `wrangler.toml` with real IDs, and apply the schema. If you have `.env` configured, `setup.sh` also populates `__INTEGRATION_TEST_SECRET__` and `__ALLOWED_ORIGINS__` from it.

## Client-side usage

[`examples/simple-likes.js`](examples/simple-likes.js) provides a `<simple-likes>` custom element for anonymous likes on any static site:

```html
<script src="simple-likes.js"></script>
<script>window.__simpleLikesApiUrl = "https://likes.yourdomain.com";</script>

<simple-likes slug="hello-world"></simple-likes>
<simple-likes slug="my-post"></simple-likes>
```

Each element renders a "N likes" button. The script automatically:
- Batch-fetches all counts on page load via a single request
- Increments the count via POST on click
- Prevents duplicates via localStorage
- Adds a `.liked` class to already-liked buttons (style it via CSS)

```css
.sl-btn.liked { color: #e74c3c; }
```

See [`examples/widget.html`](examples/widget.html) for a live demo.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start local dev server (loads `.env` automatically) |
| `npm run dev:stop` | Stop local dev server |
| `npm run dev:clean` | Remove `.wrangler/` (local D1 data and caches) |
| `npm run dev:setup` | Apply schema to local D1 database (run after `dev:clean` or on first start) |
| `npm run setup` | Auto-detect D1 databases, generate `.env`, apply schema |
| `npm run db:migrate` | Apply schema to remote D1 databases |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run unit tests with coverage report (threshold: 95%) |
| `npm run test:integration` | Run integration tests against staging (requires `INTEGRATION_TEST_SECRET` and `EXPECTED_ORIGIN`) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run changelog` | Refresh CHANGELOG [Unreleased] section |
| `npm run release` | Cut a new release (tag, changelog, push) |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run deploy:staging` | Deploy to staging environment |
| `npm run deploy:production` | Deploy to production environment |
| `npm run serve` | Start standalone Node.js server (VPS / local SQLite) |

## Project structure

```
simplelikes/
├── src/
│   ├── index.ts              Workers entry point (creates D1Storage, delegates to handleRequest)
│   ├── server.ts             Node.js/VPS entry point (creates Sqlite3Storage, HTTP server)
│   ├── db/schema.sql         D1 / SQLite schema
│   ├── storage/
│   │   ├── types.ts          IStorage interface (getCount, increment, hasVisitor, batchGet)
│   │   ├── d1.ts             D1Storage — D1Database adapter
│   │   └── sqlite.ts         Sqlite3Storage — better-sqlite3 adapter (optional dep)
│   └── utils/
│       ├── cache.ts          Cloudflare Cache API wrapper (60s GET, 30s batch)
│       ├── cors.ts           CORS whitelist + security headers
│       ├── rate-limit.ts     Per-IP + global rate limiting
│       └── validate.ts       Slug validation
├── examples/
│   └── simple-likes.js       Client-side custom element
├── vitest.config.ts          Vitest config (coverage, thresholds)
├── test/
│   ├── cache.test.ts             Unit: Cache API wrap + batchKey
│   ├── cors.test.ts              Unit: CORS whitelist + security headers
│   ├── handler.test.ts           Unit: full request routing with mocked D1
│   ├── integration.test.ts       Integration against staging
│   ├── likes.test.ts             Unit: validate utils
│   ├── rate-limit.test.ts        Unit: rate limit logic
│   └── storage.test.ts           Unit: D1Storage + Sqlite3Storage
├── .github/
│   ├── CODEOWNERS            Required reviewer (@brendaw)
│   ├── FUNDING.yml           Support links
│   ├── ISSUE_TEMPLATE/       Bug report + feature request templates
│   ├── pull_request_template.md
│   └── workflows/
│       ├── build.yml         Push main/tag → Typecheck + tests → Trigger Deploy
│       ├── deploy.yml        Deploy → Integration tests → (if tag) Release
│       └── release.yml       GitHub Release (workflow_dispatch only)
├── scripts/
│   ├── release.sh            Automated release flow
│   ├── changelog.sh          CHANGELOG generation from conventional commits
│   └── setup.sh              One-command setup script
├── .env.example              Env vars template — copy to .env (gitignored)
├── wrangler.toml.example     Wrangler config template — copy to wrangler.toml (gitignored)
├── PRIVACY.md                Privacy policy and data collection disclosure
├── MAINTAINERS.md            Maintenance policies
├── CONTRIBUTING.md           Contribution guide
├── RELEASING.md              Release process
├── CHANGELOG.md              Version history
└── AUTHORS.md                Contributors list
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow — bug fixes, improvements, and new features are welcome.

Before opening a PR, run:
```bash
npm run typecheck && npm run test:coverage
```

## License

[MIT](LICENSE) — William Brendaw, 2026.
