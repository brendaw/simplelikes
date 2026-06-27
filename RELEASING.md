# Releasing

This document describes the release process for maintainers of simplelikes.

## Scripts overview

| Script | Purpose |
|---|---|---|
| `npm run dev` | Start local dev server (loads `.env` automatically) |
| `npm run dev:stop` | Stop local dev server |
| `npm run setup` | Auto-detect D1 databases, generate `.env`, apply schema |
| `npm run db:migrate` | Apply schema to remote D1 databases |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Run unit tests with coverage report (threshold: 95%) |
| `npm run test:integration` | Run integration tests against staging (requires `INTEGRATION_TEST_SECRET`) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run changelog` | Refresh `[Unreleased]` section in CHANGELOG from conventional commits |
| `npm run deploy` | Deploy to default environment |
| `npm run deploy:staging` | Deploy to staging |
| `npm run deploy:production` | Deploy to production |
| `npm run serve` | Start standalone Node.js server (VPS / local SQLite) |
| `scripts/release.sh` | Orchestrates the full release: version detection, changelog generation, commit, tag, and push |
| `scripts/changelog.sh` | Generates CHANGELOG entries from conventional commits; run standalone to refresh [Unreleased] or during release workflow |
| `scripts/setup.sh` | One-command setup: detects D1 databases, generates `.env`, copies config, applies schema |

## Pipeline chain

### Workflows

| Workflow | Triggers | Description |
|---|---|---|
| `build.yml` | Called by Deploy, `workflow_dispatch` | Typecheck → Unit tests with coverage (threshold 95%) |
| `deploy.yml` | Push to `main`, push to tag, `workflow_dispatch` | Build → Deploy (staging/production) → Integration tests → (if production) → Release |
| `release.yml` | `workflow_dispatch` | Create GitHub Release from CHANGELOG |

### Lifecycle

| Stage | Who | Command |
|---|---|---|
| Development — test changes locally after each edit | Contributor | `npm run dev` |
| Pre-PR validation — run tests before opening a PR | Contributor | `npm test` |
| Release — when ready to publish a new version | Maintainer | `scripts/release.sh` |

### Pipeline chain

```
Push main ──► Build ──► Deploy staging ──► Integration tests ──► done
Push tag  ──► Build ──► Deploy production ──► Integration tests ──► Release
```

### Manual triggers

All workflows support `workflow_dispatch` for manual execution:

- **Build:** Optionally skip typecheck for quick iterations
- **Deploy:** Choose environment (`staging` or `production`) to deploy without a git push
- **Release:** Enter a tag (e.g. `v0.1.0`) to (re)generate a GitHub Release for that tag

## Creating a release

Releases follow [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

### Using release.sh (recommended)

Run `scripts/release.sh` to automate the entire flow:

```bash
./scripts/release.sh           # suggests next version from commit history
./scripts/release.sh v0.1.0    # explicit version override
```

The script will:

1. Detect the next version from conventional commits (MAJOR / MINOR / PATCH) or accept an explicit override
2. Ask for confirmation, then create the tag
3. Run `scripts/changelog.sh` to generate the versioned CHANGELOG entry
4. Show a diff of the changes for review
5. Ask for a final confirmation
6. Optionally, list open issues and prompt which ones to close — adds `Closes #N` to the commit message and closes them via `gh issue close`
7. Commit the CHANGELOG, push `main`, and push the tag — triggering the Deploy pipeline

The Deploy pipeline will build, deploy to production, run integration tests, and trigger the Release pipeline to create the GitHub Release with changelog notes attached.

### Manual steps (without release.sh)

If you need to run the steps individually:

1. Create the tag locally:

   ```bash
   git tag v0.1.0
   ```

2. Push `main` and then the tag:

   ```bash
   git push origin main
   git push origin v0.1.0
   ```

The key constraint: `main` must be pushed before the tag, so the workflow checks out the correct state.

## Keeping [Unreleased] up to date

Run `scripts/changelog.sh` at any point to refresh the `[Unreleased]` section with conventional commits since the last tag:

```bash
./scripts/changelog.sh
```

The script categorizes commits as:

| Prefix | CHANGELOG section |
|---|---|
| `feat:` | Added |
| `fix:` | Fixed |
| `docs:`, `chore:`, `ci:`, `refactor:`, `style:`, `perf:`, `test:` | Changed |

Commits without a conventional prefix are ignored.

## Fixing a failed deploy

The Deploy pipeline runs Build → Deploy → Integration tests. If any stage fails, no production deployment happens.

### CI or config failure (no source change needed)

1. Fix the issue in `main` and push
2. Go to **Actions → Deploy → Run workflow**
3. Select **staging** environment and the fixed branch
4. If staging succeeds, repeat with **production** to deploy the fix
5. Once production is verified, recreate the release manually via **Actions → Release → Run workflow** with the original tag

### Source code failure (`src/` needs a fix on an existing tag)

Fix the code, commit, and move the tag to the new commit:

```bash
git add src/...
git commit -m "fix: ..."

git tag -f v0.1.0
git push origin main
git push --force origin v0.1.0
```

Pushing the tag again re-triggers the Deploy pipeline automatically.

### Integration test failure after deploy

If the deploy succeeded but integration tests failed:

1. Investigate the failure — it may be an environment issue (D1 unavailability, DNS) rather than code
2. Fix the root cause
3. If no code change needed: re-run the **Deploy** workflow manually for the same environment
4. If code change needed: fix, commit, push the tag again (see above)

## Recreating or backfilling a release for an existing tag

If a GitHub Release needs to be (re)generated for an older tag:

1. Go to **Actions → Release → Run workflow**
2. Enter the tag in the **"Tag to release"** field (e.g. `v0.1.0`)
3. Click **Run workflow**

The workflow checks out the specified tag, parses its CHANGELOG entry, and creates or updates the GitHub Release accordingly.

> The Release workflow does not run Build or Deploy — it only creates the GitHub Release from the CHANGELOG. For production deploy, use the Deploy workflow.

## When not to create a release

Releases exist to deploy a new version of the API to production. Changes that do not touch `src/` — documentation updates, CI fixes, repository housekeeping — do not warrant a new tag or release.

For those changes: commit and push to `main` normally. They will be included in the next release when an actual code change is ready.

---

[Back to README](README.md)
