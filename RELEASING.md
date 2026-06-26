# Releasing

This document describes the release process for maintainers of simplelikes.

## Scripts overview

| Script | Purpose |
|---|---|
| `npm run dev` | Start local dev server for development testing |
| `npm test` | Run test suite |
| `npm run deploy` | Deploy to default environment |
| `npm run deploy:staging` | Deploy to staging |
| `npm run deploy:production` | Deploy to production |
| `scripts/release.sh` | Orchestrates the full release: version detection, changelog, commit, tag, and push |

### Lifecycle

| Stage | Who | Command |
|---|---|---|
| Development — test changes locally after each edit | Contributor | `npm run dev` |
| Pre-PR validation — run tests before opening a PR | Contributor | `npm test` |
| Release — when ready to publish a new version | Maintainer | `scripts/release.sh` |

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
3. Show a diff of the changes for review
4. Ask for a final confirmation
5. Optionally, list open issues and prompt which ones to close — adds `Closes #N` to the commit message and closes them via `gh issue close`
6. Commit, push `main`, and push the tag — triggering the release workflow

The CI will deploy to production and create a GitHub Release with changelog notes attached.

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

## Fixing a failed release

The release workflow runs CI checks before deploying. If the checks fail, no production deployment happens.

### CI config or workflow failure (no source change needed)

Fix the issue in `main`, then re-trigger the release workflow manually via `workflow_dispatch`:

1. Fix the issue and push to `main`
2. Go to **Actions → Release → Run workflow**
3. Enter the original tag (e.g. `v0.1.0`) in the **"Tag to release"** field
4. Click **Run workflow**

### Source code failure (`src/` needs a fix)

Fix the code, commit, and move the tag to the new commit:

```bash
# fix the issue, then:
git add src/...
git commit -m "fix: ..."

git tag -f v0.1.0
git push origin main
git push --force origin v0.1.0
```

Pushing the tag again re-triggers the release workflow automatically.

## When not to create a release

Releases exist to deploy a new version of the API to production. Changes that do not touch `src/` — documentation updates, CI fixes, repository housekeeping — do not warrant a new tag or release.

For those changes: commit and push to `main` normally. They will be included in the next release when an actual code change is ready.

---

[Back to README](README.md)
