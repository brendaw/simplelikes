# Contributing to simplelikes

Contributions are welcome — bug fixes, improvements, and new features.

For bug reports or feature requests, [open an Issue](https://github.com/brendaw/simplelikes/issues) first so the approach can be discussed before you start coding.

## Prerequisites

- Node.js 22+
- npm
- No Cloudflare account needed for local development — a local SQLite database is used
- Wrangler CLI (`npm install -g wrangler`) and `wrangler login` only needed for deployment

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

3. Start the local dev server (loads `.env` automatically):

   ```bash
   npm run dev
   ```

   The server starts at `http://localhost:8787`. You can test endpoints with curl:

   ```bash
   curl http://localhost:8787/likes/hello-world
   ```

4. Make your changes in `src/`.

5. Run type check and tests before opening a PR:

   ```bash
   npm run typecheck && npm test
   ```

6. Open a Pull Request against `main` describing what changed and why.

You do not need to bump versions or update CHANGELOG.md — versioning and releases are handled by the maintainer after the PR is merged.

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

| Script | Purpose |
|---|---|
| `npm run dev` | Start local dev server (loads `.env` automatically) |
| `npm run dev:stop` | Stop local dev server |
| `npm run setup` | Auto-detect D1 databases, generate `.env`, apply schema |
| `npm run db:migrate` | Apply schema to remote D1 databases |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Run unit tests with coverage report (threshold: 90%) |
| `npm run test:integration` | Run integration tests against staging (requires `INTEGRATION_TEST_SECRET`) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run deploy` | Deploy to Cloudflare Workers |

`scripts/release.sh`, `scripts/changelog.sh`, and `scripts/setup.sh` are maintainer-only scripts. The setup is also available via `npm run setup` for contributors with Cloudflare access.

`npm run test:integration` requires a valid `INTEGRATION_TEST_SECRET` and is intended for maintainers only. Contributors without the secret will have these tests skipped automatically.

## API design principles

simplelikes follows a pragmatic REST approach. Understanding these conventions helps keep the API consistent:

### HTTP method semantics

| Method | When to use | Examples |
|---|---|---|
| `GET` | Single resource reads — no body, no side effects | `GET /likes/:slug` |
| `POST` | State-changing operations (writes) | `POST /likes/:slug` (increment) |
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

## CI checks

| Workflow | Trigger | Checks |
|---|---|---|
| **CI** | Called by deploy/release workflows | Type check + unit tests |
| **Deploy** | Push to `main`, push to tag, `workflow_dispatch` | Calls CI, then deploys to staging (branch) or production (tag) |
| **Release** | Push to tag, `workflow_dispatch` | Calls CI, then creates GitHub Release from CHANGELOG |

---

Maintainers: see [MAINTAINERS.md](MAINTAINERS.md) for maintenance policies and [RELEASING.md](RELEASING.md) for the release process.

[Back to README](README.md)
