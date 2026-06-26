# Contributing to simplelikes

Contributions are welcome — bug fixes, improvements, and new features.

For bug reports or feature requests, [open an Issue](https://github.com/brendaw/simplelikes/issues) first so the approach can be discussed before you start coding.

## Prerequisites

- Node.js 22+
- npm
- A Cloudflare account (for deployment; not required for local development)
- Wrangler CLI (installed via `npm install`)

## How to contribute

1. [Fork the repository](https://github.com/brendaw/simplelikes/fork) and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/simplelikes.git
   cd simplelikes
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the local dev server:

   ```bash
   npm run dev
   ```

   The server starts at `http://localhost:8787`. You can test endpoints with curl:

   ```bash
   curl http://localhost:8787/likes/hello-world
   ```

4. Make your changes in `src/`.

5. Run tests before opening a PR:

   ```bash
   npm test
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
| `npm run dev` | Start local dev server with Wrangler |
| `npm test` | Run test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run deploy` | Deploy to Cloudflare Workers |

`scripts/release.sh` is maintainer-only and is not part of the contributor workflow.

## CI checks

Every push to `main` and every pull request runs automated checks:

| Check | What it does |
|---|---|
| **Deploy** | Deploys to staging on push to `main`; deploys to production on tag push |

Additional CI checks (lint, typecheck) may be added in the future.

---

Maintainers: see [MAINTAINERS.md](MAINTAINERS.md) for maintenance policies and [RELEASING.md](RELEASING.md) for the release process.

[Back to README](README.md)
