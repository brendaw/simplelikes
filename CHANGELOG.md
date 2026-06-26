# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

