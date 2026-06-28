# Contributing to simplelikes

Contributions are welcome — bug fixes, improvements, and new features.

For bug reports or feature requests, [open an Issue](https://github.com/brendaw/simplelikes/issues) first so the approach can be discussed before you start coding.

## Prerequisites

- Node.js 22+
- npm
- No Cloudflare account needed for local development — a local SQLite database is used
- Wrangler CLI (`npm install -g wrangler`) and `wrangler login` only needed for deployment
- `better-sqlite3` (optional) — installs automatically with `npm install`; only needed for the VPS/standalone server

## How to contribute

1. [Fork the repository](https://github.com/brendaw/simplelikes/fork) and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/simplelikes.git
   cd simplelikes
   ```

2. Install dependencies and initialize config:

   ```bash
   npm install
   cp .env.example .env
   ```

3. Create local D1 tables (required once):

   ```bash
   npm run dev:setup
   ```

4. Start the local dev server (loads `.env` automatically):

   ```bash
   npm run dev
   ```

   The server starts at `http://localhost:8787`. You can test endpoints with curl:

   ```bash
   curl http://localhost:8787/likes/hello-world
   ```

5. Make your changes in `src/`.

 6. Run type check and tests before opening a PR:

    ```bash
    npm run typecheck && npm test
    ```

    If you made changes to backend code (`src/`), verify coverage is maintained:

    ```bash
    npm run test:coverage
    ```

    The project requires **≥95% coverage** (statements, branches, functions, lines). New features must include tests that cover the new code.

    If you changed the client-side web component (`src/client/`), also run the web component tests:

    ```bash
    npx vitest run tests/unit/client/
    ```

 7. Update any documentation that became outdated with your changes — this includes inline code comments, JSDoc, README sections, or example files. If you changed the client component, rebuild the bundle:

    ```bash
    npm run build:client
    ```

    If the change introduces or modifies a user-facing feature, ensure the corresponding docs reflect it.

 8. Open a Pull Request against `main` describing what changed and why.

You do not need to bump versions or update CHANGELOG.md — versioning and releases are handled by the maintainer after the PR is merged.

## Testing expectations

### Code coverage

The project enforces **≥95% coverage** on `src/` (backend). The CI pipeline breaks if coverage drops below the threshold. Always check:

```bash
npm run test:coverage
```

### Client-side tests

The web component in `src/client/` (TypeScript source, bundled to `dist/simplelikes.js`) has its own test suite in `tests/unit/client/` using `happy-dom` for DOM emulation. If you modify the component, add or update tests in that directory.

### Before submitting

Run a full local check to make sure nothing is broken:

```bash
npm run typecheck
npm run test:coverage       # backend unit tests + coverage
npx vitest run tests/unit/client/  # web component tests
```

Integration tests are optional for contributors (requires `INTEGRATION_TEST_SECRET`) and are run automatically in CI after deployment.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow the format:

```
type: short description
```

| Type | When to use |
|---|---|
| `feat` | New feature or behavior visible to API consumers |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, configuration |
| `ci` | CI/CD workflow changes |
| `refactor` | Code restructuring without behavior change |
| `style` | Formatting, whitespace |
| `test` | Tests |
| `perf` | Performance improvements |

The type determines how the commit appears in the CHANGELOG and influences the version bump on the next release.

## Code style

The repository includes an `.editorconfig` file. Most editors support it natively or via plugin:

- UTF-8 encoding and LF line endings
- 2-space indentation for `.ts`, `.js`, `.json`
- Tab indentation for `.sh` scripts
- Final newline and no trailing whitespace (except `.md`)

## Scripts

See the [Scripts table in README.md](README.md#scripts) for the full list of available commands.

`scripts/release.sh`, `scripts/changelog.sh`, and `scripts/setup.sh` are maintainer-only scripts. The setup is also available via `npm run setup` for contributors with Cloudflare access.

`npm run test:integration` requires valid `INTEGRATION_TEST_SECRET` and `EXPECTED_ORIGIN` environment variables and is intended for maintainers only. Contributors without the secret will have these tests skipped automatically.

## API design principles

simplelikes follows a pragmatic REST approach. Understanding these conventions helps keep the API consistent:

### HTTP method semantics

| Method | When to use | Examples |
|---|---|---|
| `GET` | Single resource reads — no body, no side effects | `GET /likes/:slug` |
| `POST` | State-changing operations (writes) | `POST /likes/:slug` (toggle) |
| `POST` (for-read) | Batch reads requiring a body — RFC 9110 §9.3.1 discourages `GET` with body | `POST /likes/batch` |

### Why POST for batch reads?

Sending a JSON body with `GET` is technically allowed by HTTP but:

1. **RFC 9110 §9.3.1** — body in GET has "no generally defined semantics" and is flagged as a request smuggling risk
2. **CDN/proxy behavior** — intermediaries may strip the body or reject the connection
3. **Browser fetch API** — `GET` with body works but is non-standard

The `POST`-for-read pattern is well established: Elasticsearch (`POST /_search`), GraphQL (`POST /graphql`), OData (`POST /$batch`), and AWS DynamoDB all use POST for reads with complex input.

### Rate limit categorization

For rate limiting purposes, operations are categorized by **semantics**, not HTTP method:

| Endpoint | Semantics | Counts against |
|---|---|---|
| `GET /likes/:slug` | Read | Global GET limit (500/min) |
| `POST /likes/:slug` | Write | Global POST limit (50/min) |
| `POST /likes/batch` | Batch read | Global GET limit (500/min) |

This ensures the D1 write quota (100k rows/day on free tier) is protected by the stricter POST limit, while read-heavy batch operations use the more generous GET limit.

### Rate limit flow

The request pipeline evaluates limits in this order:

1. **Input validation** — slug format (`[a-z0-9/-]`, max 200 chars), batch size (max 50), method
2. **Global rate limit** — per-method safeguard (500 GET/min, 50 POST/min)
3. **Per-IP rate limit** — 10 req/min per origin IP
4. **D1 query** — actual database read or write
5. **Caching** — batch `cache.put()` runs in background (`ctx.waitUntil`), GET cache is stored synchronously
6. **CORS wrapping** — `cors.wrap()` clones the response and adds origin / security headers, applied after cache so both fresh and cached responses get correct CORS headers

Steps 2 and 3 return `429 Too Many Requests` with `Retry-After` header. A failed step rejects the request before the next step runs.

### CORS and security headers

Every response includes security headers. CORS is configurable via the `ALLOWED_ORIGINS` env var:

| Header | Preflight | Normal response |
|---|---|---|
| `Access-Control-Allow-Origin` | Request origin (if whitelisted) | Same |
| `Access-Control-Allow-Methods` | `GET, POST, OPTIONS` | — |
| `Access-Control-Allow-Headers` | `Content-Type, X-Visitor-Id` | — |
| `Access-Control-Max-Age` | `86400` (24h) | — |
| `Vary` | — | `Origin` |
| `X-Content-Type-Options` | — | `nosniff` |
| `X-Frame-Options` | — | `DENY` |

Default allowed origins: `http://localhost:8787`. For production, set `ALLOWED_ORIGINS` to your comma-separated domains (configured via Cloudflare dashboard or CI env vars). The CI pipeline reads `ALLOWED_ORIGINS` from [GitHub Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) — forks must configure their own secret or the CORS integration test will fail.

### Key constraints

- No `PUT`, `PATCH`, or `DELETE` — the API is intentionally minimal
- Slugs follow `[a-z0-9/-]` pattern, max 200 chars
- Max 50 slugs per batch request
- All responses include CORS and security headers
- Rate limits return `Retry-After` header with seconds until reset

### When to add a new endpoint

Before adding a new endpoint, ask:

- Could this be done with the existing endpoints? (e.g., `POST /likes/batch` + individual GETs covers most read patterns)
- Does it need a body / many parameters? → POST-for-read
- Does it operate on a single resource with just a path param? → GET
- Is it a write? → POST

## CI/CD pipeline

| Workflow | Trigger | Stages |
|---|---|---|
| **Build** | Push to `main`, push to tag, `workflow_dispatch` | Typecheck → Unit tests with coverage (threshold 95%) → (if push) Trigger Deploy |
| **Deploy** | `workflow_dispatch` only (called by Build or manually) | Deploy (staging/production) → Integration tests → (if production tag) Trigger Release |
| **Release** | `workflow_dispatch` only | Create GitHub Release from CHANGELOG |

The pipeline chain flows automatically:

```
Push main ──► Build ──► Deploy staging ──► Integration tests ──► done
Push tag  ──► Build ──► Deploy production ──► Integration tests ──► Release
```

All three workflows can also be triggered manually via `workflow_dispatch` for reprocessing. See [MAINTAINERS.md](MAINTAINERS.md) for details.

---

Maintainers: see [MAINTAINERS.md](MAINTAINERS.md) for maintenance policies and [RELEASING.md](RELEASING.md) for the release process.

[Back to README](README.md)
