# Releasing

This document describes the release process for maintainers.

## Creating a release

Releases follow [Semantic Versioning](https://semver.org/). Run the release script:

```bash
./scripts/release.sh           # suggests next version from commit history
./scripts/release.sh v0.1.0    # explicit version override
```

The script will:

1. Detect the next version from conventional commits or accept an override
2. Ask for confirmation, then create the tag
3. Push `main` and the tag — triggering the release workflow

The CI will create a GitHub Release with changelog notes attached.

## Manual steps (without release.sh)

```bash
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

---

[Back to README](README.md)
