# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.1](https://github.com/brendaw/simplelikes/releases/tag/v1.1.1) - 2026-06-28

### Fixed

- Remove stray quote in release.sh causing syntax error

## [1.1.0](https://github.com/brendaw/simplelikes/releases/tag/v1.1.0) - 2026-06-28

### Added

- Add global config for custom like text
- Add custom like text with pluralization to simple-likes web component

### Fixed

- Split release flow — push main first, tag only after staging validation

### Changed

- Document custom text and global config for web component
- Add web component tests and update CONTRIBUTING.md
- Add custom text examples to widget.html demo

## [1.0.2](https://github.com/brendaw/simplelikes/releases/tag/v1.0.2) - 2026-06-28

### Changed

- Fix batch integration test expectation after toggle behavior

## [1.0.1](https://github.com/brendaw/simplelikes/releases/tag/v1.0.1) - 2026-06-28

### Changed

- Add coverage for configure() branches, X-Version header, and env var overrides

## [1.0.0](https://github.com/brendaw/simplelikes/releases/tag/v1.0.0) - 2026-06-28

### Added

- Add X-Version header injected from git tag/sha via wrangler vars
- Implement like/unlike toggle with atomic decrement, update docs
- Implement like/unlike toggle with atomic decrement
- Add like button widget and fix dev CORS for common localhost ports
- Add like button widget and widen dev CORS defaults to common localhost ports
- Add like button widget with SVG icons and custom element

### Changed

- Deduplicate scripts table, add error feedback to widget
- Fix toggle description, curl example, privacy hash, and quick start setup
- Add privacy policy (PRIVACY.md) and widget data disclosure
- Replace personal hosts/URLs with generic placeholders
- Add default badge styling to simple-likes button

## [0.6.10](https://github.com/brendaw/simplelikes/releases/tag/v0.6.10) - 2026-06-27

### Changed

- Add SECURITY.md with vulnerability disclosure policy
- Document trigger-release always() and transitive skip in MAINTAINERS.md

## [0.6.9](https://github.com/brendaw/simplelikes/releases/tag/v0.6.9) - 2026-06-27

### Changed

- Bump actions to Node 24 runtime (checkout@v7, setup-node@v6, gh-release@v3)

## [0.6.8](https://github.com/brendaw/simplelikes/releases/tag/v0.6.8) - 2026-06-27

### Changed

- Add checkout step to trigger-release job for gh CLI

## [0.6.7](https://github.com/brendaw/simplelikes/releases/tag/v0.6.7) - 2026-06-27

### Changed

- Force trigger-release scheduling with always() to bypass transitive skip

## [0.6.6](https://github.com/brendaw/simplelikes/releases/tag/v0.6.6) - 2026-06-27

### Changed

- Gate trigger-release on environment input instead of job output

## [0.6.5](https://github.com/brendaw/simplelikes/releases/tag/v0.6.5) - 2026-06-27

### Changed

- Fix trigger-release gating using needs instead of output comparison

## [0.6.4](https://github.com/brendaw/simplelikes/releases/tag/v0.6.4) - 2026-06-27

### Fixed

- Create scripts dir in distribution archive before copying
- Make distribution archive resilient to missing files in older tags

### Changed

- Update CI/CD pipeline and secret references in MAINTAINERS.md and RELEASING.md
- Update pipeline flow and workflow triggers in MAINTAINERS.md and RELEASING.md
- Move integration test URLs to GitHub Secrets
- Gate trigger-release behind integration tests on production

## [0.6.3](https://github.com/brendaw/simplelikes/releases/tag/v0.6.3) - 2026-06-27

### Changed

- Attach distribution archive to GitHub Release
- Simplify workflow run-name format
- Pass --ref tag to release workflow trigger

## [0.6.2](https://github.com/brendaw/simplelikes/releases/tag/v0.6.2) - 2026-06-27

### Changed

- Trigger release from deploy-production instead of workflow_run event
- Automate workflow run-name from commit message or tag name

## [0.6.1](https://github.com/brendaw/simplelikes/releases/tag/v0.6.1) - 2026-06-27

### Fixed

- Use short SHA for staging run-name

### Changed

- Replace gh workflow run with native workflow_run chaining

## [0.6.0](https://github.com/brendaw/simplelikes/releases/tag/v0.6.0) - 2026-06-27

### Added

- Add run-name to Release and Deploy workflows
- Add run-name to Deploy workflow showing environment and ref

### Fixed

- Use startsWith instead of ref_type to trigger Release
- Validate tag push with git ls-remote after push

## [0.5.4](https://github.com/brendaw/simplelikes/releases/tag/v0.5.4) - 2026-06-27

### Fixed

- Add actions/checkout before gh workflow run to provide git context

## [0.5.3](https://github.com/brendaw/simplelikes/releases/tag/v0.5.3) - 2026-06-27

### Fixed

- Use needs.integration-tests.result instead of success() for release trigger

### Changed

- Segregate pipeline badges into Build, Staging, and Production
- Decouple Build and Deploy into independent workflows

## [0.5.2](https://github.com/brendaw/simplelikes/releases/tag/v0.5.2) - 2026-06-27

### Fixed

- Apply CORS after cache layer and clone response for immutable cached headers
- Apply CORS headers after cache to handle immutable cached responses
- Apply CORS headers outside cache layer

## [0.5.1](https://github.com/brendaw/simplelikes/releases/tag/v0.5.1) - 2026-06-27

### Fixed

- Resolve batch key as valid HTTP URL for Cache API

### Changed

- Add GitHub Secrets table, update integration test instructions
- Pass EXPECTED_ORIGIN secret to integration tests
- Read EXPECTED_ORIGIN from env, fail with clear message

## [0.5.0](https://github.com/brendaw/simplelikes/releases/tag/v0.5.0) - 2026-06-26

### Added

- Restructure deploy pipeline with integration tests and automated release trigger
- Rename CI to Build with separate typecheck and unit-test stages
- Increase coverage threshold from 90% to 95%

### Fixed

- Update compatibility_date to 2026-06-01, fix setup.sh to replace all placeholders, and correct README config docs

### Changed

- Add missing storage.test.ts to project tree, document VPS env setup, and fix production URLs
- Fix outdated pipeline references across README, CONTRIBUTING, and RELEASING
- Rewrite MAINTAINERS.md with pipeline diagram and maintenance flow
- Update pipeline documentation and coverage threshold to 95%

## [0.4.1](https://github.com/brendaw/simplelikes/releases/tag/v0.4.1) - 2026-06-26

### Added

- Add serve script and tsx dev dependency for VPS server
- Extract shared handleRequest, add Node.js HTTP server for VPS
- Add Sqlite3Storage implementation with better-sqlite3
- Extract IStorage interface and D1Storage implementation

### Fixed

- Use pipe delimiter in sed to handle URLs in ALLOWED_ORIGINS

### Changed

- Add data/ to .gitignore for VPS SQLite database
- Add D1Storage and Sqlite3Storage unit tests
- Add VPS/standalone server documentation
- Add missing test:watch script to README
- Add missing scripts to RELEASING.md, document CORS and rate-limit flow in CONTRIBUTING.md
- Remove outdated portable claim and other platforms section
- Fix env vars table — add INTEGRATION_TEST_SECRET, remove unused D1_DATABASE_ID
- Document caching behavior and add cache.ts to project structure

## [0.4.0](https://github.com/brendaw/simplelikes/releases/tag/v0.4.0) - 2026-06-26

### Added

- Cache POST /likes/batch with 30s TTL using SHA-256 body hash
- Add ctx parameter and cache GET /likes/:slug with 60s TTL
- Add generic cache utility using Cloudflare Cache API

### Changed

- Add cache unit tests and mock caches global for 100% coverage

## [0.3.0](https://github.com/brendaw/simplelikes/releases/tag/v0.3.0) - 2026-06-26

### Added

- Add global rate limit safeguard for D1 quota

### Changed

- Document batch design rationale and API principles
- Add global rate limit unit and handler tests

## [0.2.1](https://github.com/brendaw/simplelikes/releases/tag/v0.2.1) - 2026-06-26

### Changed

- Default ALLOWED_ORIGINS to localhost:8787
- Remove Fly.io and Supabase references from README
- Remove hardcoded CORS default origin
- Update scripts, project structure, and coverage info

## [0.2.0](https://github.com/brendaw/simplelikes/releases/tag/v0.2.0) - 2026-06-26

### Added

- Add integration test guard with X-Integration-Test header > > Introduce INTEGRATION_TEST_SECRET env to protect the staging > endpoint from unauthorized requests. Requests with a valid > X-Integration-Test header bypass rate limiting. Requests with > an invalid secret return 401.

### Changed

- Add unit tests for 100% code coverage
- Add coverage check with v8 provider and 90% threshold
- Add integration test references to README and contributing guide
- Auto-load INTEGRATION_TEST_SECRET from .env for test:integration
- Add integration test npm script and maintainer docs
- Add integration tests against staging
- Add INTEGRATION_TEST_SECRET to .env.example
- Inject INTEGRATION_TEST_SECRET into staging wrangler.toml
- Add INTEGRATION_TEST_SECRET placeholder to wrangler.toml.example

## [0.1.6](https://github.com/brendaw/simplelikes/releases/tag/v0.1.6) - 2026-06-26

### Fixed

- Correct wrangler.toml substitution for deploy and deploy staging

## [0.1.5](https://github.com/brendaw/simplelikes/releases/tag/v0.1.5) - 2026-06-26

### Fixed

- Remove process.env dependency for Workers runtime compatibility

### Changed

- Add .env-based config, dev:stop, setup and db:migrate scripts
- Add .env-based config, dev:stop, setup and db:migrate scripts
- Add dev:stop, setup and db:migrate scripts; fix CORS and local-first dev
- Add setup, db:migrate scripts and fix typecheck

## [0.1.4](https://github.com/brendaw/simplelikes/releases/tag/v0.1.4) - 2026-06-26

### Fixed

- Changelog.sh now writes "Nothing yet" when [Unreleased] has no commits

### Changed

- Add npm scripts for changelog/release and sync docs with project structure
- Restructure workflows with reusable CI pipeline and manual dispatch
- Reorder CHANGELOG entries descending and add empty-state placeholder

## [0.1.3](https://github.com/brendaw/simplelikes/releases/tag/v0.1.3) - 2026-06-26

### Changed

- Make scripts/changelog.sh executable

## [0.1.2](https://github.com/brendaw/simplelikes/releases/tag/v0.1.2) - 2026-06-26

### Changed

- Add changelog.sh with release workflow integration
- Gitignore .wrangler/ directory
- Enhance release.sh with semver bump detection and issue closing

## [0.1.1](https://github.com/brendaw/simplelikes/releases/tag/v0.1.1) - 2026-06-26

### Changed

- Enhance release.sh with semver bump detection and issue closing
- Gitignore wrangler.toml and generate from example in CI
- Add Wrangler setup instructions to README, CONTRIBUTING, and wrangler.toml.example

## [0.1.0](https://github.com/brendaw/simplelikes/releases/tag/v0.1.0) - 2026-06-26

### Changed

- See git log for details

