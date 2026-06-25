# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial project structure
- GET /likes/:slug endpoint
- POST /likes/:slug endpoint
- POST /likes/batch endpoint
- CORS whitelist support
- Rate limiting per IP
- Slug validation
- D1 schema for likes and likes_visitors tables
- GitHub Actions for deploy and release
- Client-side integration example (`examples/likes.js`)
