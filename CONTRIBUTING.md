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
|---|---|---|
| `npm run dev` | Start local dev server (loads `.env` automatically) |
| `npm run dev:stop` | Stop local dev server |
| `npm run setup` | Auto-detect D1 databases, generate `.env`, apply schema |
| `npm run db:migrate` | Apply schema to remote D1 databases |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:integration` | Run integration tests against staging (requires `INTEGRATION_TEST_SECRET`) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run deploy` | Deploy to Cloudflare Workers |

`scripts/release.sh`, `scripts/changelog.sh`, and `scripts/setup.sh` are maintainer-only scripts. The setup is also available via `npm run setup` for contributors with Cloudflare access.

`npm run test:integration` requires a valid `INTEGRATION_TEST_SECRET` and is intended for maintainers only. Contributors without the secret will have these tests skipped automatically.

## CI checks

| Workflow | Trigger | Checks |
|---|---|---|
| **CI** | Called by deploy/release workflows | Type check + unit tests |
| **Deploy** | Push to `main`, push to tag, `workflow_dispatch` | Calls CI, then deploys to staging (branch) or production (tag) |
| **Release** | Push to tag, `workflow_dispatch` | Calls CI, then creates GitHub Release from CHANGELOG |

---

Maintainers: see [MAINTAINERS.md](MAINTAINERS.md) for maintenance policies and [RELEASING.md](RELEASING.md) for the release process.

[Back to README](README.md)
