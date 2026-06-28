# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| Latest release | ✅ |
| Older releases | ❌ |

Only the latest published release receives security patches. Users are encouraged to always run the latest version.

## Reporting a vulnerability

### Private disclosure (preferred)

Report vulnerabilities via **GitHub's private vulnerability reporting**:

1. Go to the repository's **[Security tab](https://github.com/brendaw/simplelikes/security)**
2. Click **"Report a vulnerability"**
3. Fill in the details — no account needed beyond a GitHub account

This ensures the report is only visible to repository maintainers until a fix is released.

### What to include

A good report helps us respond quickly:

- **Description** — what kind of issue is it? (XSS, data leak, rate limit bypass, etc.)
- **Steps to reproduce** — exact requests, payloads, or configuration
- **Impact** — what could an attacker achieve?
- **Environment** — Cloudflare Workers, VPS/standalone, or both

### Response timeline

| Timeframe | Expectation |
|---|---|
| Within 48h | Acknowledgment of receipt |
| Within 7 days | Initial assessment and severity classification |
| Within 30 days | Fix released or mitigations published (for high/critical severity) |

We ask that you **do not disclose the vulnerability publicly** until a fix has been released and the release is published.

## Scope

The following components are covered by this policy:

- **Worker handler** — `src/index.ts`, `src/server.ts`, and all files in `src/`
- **Client script** — `examples/simple-likes.js`
- **Database schema and queries** — `src/db/schema.sql` and storage adapters (`src/storage/`)
- **CORS, rate limiting, and validation logic** — `src/utils/`

### Out of scope

The following are **not** covered by this policy. Please report issues to the respective project:

- **Cloudflare Workers / D1 infrastructure** — report to [Cloudflare HackerOne](https://hackerone.com/cloudflare)
- **Third-party dependencies** — report to the respective project (see `package.json`)
- **VPS/standalone deployments** — these are the user's own infrastructure; vulnerabilities in the simplelikes code running there are in scope, but OS-level or network-level issues are not
