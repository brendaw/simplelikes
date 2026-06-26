<p align="center">
  <img src="https://badgen.net/github/license/brendaw/simplelikes">
  <img src="https://badgen.net/badge/status/active/green">
  <img src="https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-F38020?logo=cloudflare&logoColor=white">
  <a href="https://github.com/brendaw/simplelikes/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/brendaw/simplelikes/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/brendaw/simplelikes/actions/workflows/deploy.yml"><img alt="Deploy" src="https://github.com/brendaw/simplelikes/actions/workflows/deploy.yml/badge.svg"></a>
  <a href="https://github.com/brendaw/simplelikes/issues"><img alt="Issues" src="https://badgen.net/github/open-issues/brendaw/simplelikes"></a>
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

#### One-command setup

```bash
npm run setup
```

This auto-detects your D1 databases, creates `.env` with real IDs, copies `wrangler.toml.example`, and applies the schema.

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

### Other platforms

simplelikes can be adapted to any JavaScript runtime that supports SQLite or HTTP request handling. See issues [#8](https://github.com/brendaw/simplelikes/issues/8) (Fly.io) and [#9](https://github.com/brendaw/simplelikes/issues/9) (Supabase) for planned deployment adapters.

## Configuration

### Environment variables

| Env var | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://williambrendaw.com` | Comma-separated list of allowed CORS origins |
| `D1_DATABASE_ID` | — | Cloudflare D1 database ID |

### Local configuration

Both `wrangler.toml` and `.env` are gitignored. Start from the examples:

```bash
cp .env.example .env
cp wrangler.toml.example wrangler.toml
```

The `wrangler.toml` uses `{env.VAR}` placeholders resolved at runtime by Wrangler. For local dev, the `.env` file provides these values — no Cloudflare account required.

For Cloudflare deployment, use `npm run setup` to auto-detect databases and generate both files.

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

## Scripts

| Script | Purpose |
|---|---|---|
| `npm run dev` | Start local dev server (loads `.env` automatically) |
| `npm run dev:stop` | Stop local dev server |
| `npm run setup` | Auto-detect D1 databases, generate `.env`, apply schema |
| `npm run db:migrate` | Apply schema to remote D1 databases |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run unit tests |
| `npm run test:integration` | Run integration tests against staging (requires `INTEGRATION_TEST_SECRET`) |
| `npm run changelog` | Refresh CHANGELOG [Unreleased] section |
| `npm run release` | Cut a new release (tag, changelog, push) |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run deploy:staging` | Deploy to staging environment |
| `npm run deploy:production` | Deploy to production environment |

## Project structure

```
simplelikes/
├── src/
│   ├── index.ts              Worker handler
│   ├── db/schema.sql         D1 schema
│   └── utils/
│       ├── cors.ts           CORS whitelist + security headers
│       ├── rate-limit.ts     Rate limiting per IP
│       └── validate.ts       Slug validation
├── examples/
│   └── likes.js              Client-side integration example
├── test/
│   ├── likes.test.ts             Unit tests (validateSlug)
│   └── integration.test.ts       Integration tests against staging
├── .github/
│   ├── CODEOWNERS            Required reviewer (@brendaw)
│   ├── FUNDING.yml           Support links
│   ├── ISSUE_TEMPLATE/       Bug report + feature request templates
│   ├── pull_request_template.md
│   └── workflows/
│       ├── ci.yml            Reusable typecheck + tests (workflow_call)
│       ├── deploy.yml        Staging on push, production on tag + manual dispatch
│       └── release.yml       GitHub Release on tag + manual dispatch
├── scripts/
│   ├── release.sh            Automated release flow
│   ├── changelog.sh          CHANGELOG generation from conventional commits
│   └── setup.sh              One-command setup script
├── .env.example              Env vars template — copy to .env (gitignored)
├── wrangler.toml.example     Wrangler config template — copy to wrangler.toml (gitignored)
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
npm run typecheck && npm test
```

## License

[MIT](LICENSE) — William Brendaw, 2026.
