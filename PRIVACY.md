# Privacy Policy

simplelikes is designed to be **anonymous by default**. This document explains what data is collected, how it is used, and what responsibilities site owners have when embedding the widget.

> **Disclaimer:** This document is for informational purposes only and does not constitute legal advice. Consult a qualified attorney for advice on your specific privacy obligations under GDPR, LGPD, CCPA, or any other applicable regulation.

## Data collected

| Data point | Collected? | Details |
|---|---|---|
| IP address | ❌ Never stored | Used transiently for rate limiting (in-memory, no log) |
| User-Agent | ❌ Never stored | Not read or transmitted |
| Cookies | ❌ None set | No cookies set server-side or client-side |
| localStorage (client-side) | ✅ Used by widget | Stores `liked:<slug>` flag for persistence across page loads — no personal data, never sent to the server |
| Browser fingerprint | ❌ Not collected | `X-Visitor-Id` is a client-side hash, never sent raw |
| Page URL | ❌ Not collected | Only the slug is sent (e.g., `hello-world`) |
| Slug + count | ✅ Stored in D1/SQLite | The only persisted data |
| Visitor hash | ✅ Stored in D1/SQLite | Opaque hash for deduplication, not reversible to PII |

### Visitor hash

The `X-Visitor-Id` header sent by the client script is a **simple hash of the browser's `User-Agent` and screen dimensions**, generated client-side by the `<simple-likes>` custom element. The server never receives the raw `User-Agent` or screen dimensions — only the opaque hash, which cannot be reversed to recover the original values.

## How data is used

- **Like counts** (`slug` + `count`) are exposed via the API and displayed to visitors
- **Visitor hashes** are used exclusively for deduplication (one like per visitor per slug) and are never exposed via the API
- **IP addresses** are held temporarily in memory for rate limiting and discarded after the request completes — they are not logged, stored, or transmitted
- **localStorage** (client-side only) stores a `liked:<slug>` flag so the widget remembers which slugs the visitor already liked across page loads — this data never leaves the browser

## Data retention

- **Like counts** are retained until explicitly deleted (the API does not currently provide a delete endpoint)
- **Visitor hashes** are retained indefinitely alongside slug counts for deduplication
- **In-memory rate limit data** is never persisted and resets on worker restart

## Third-party processing

When deployed on **Cloudflare Workers + D1**, data is processed and stored on Cloudflare's infrastructure. Refer to [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/) for details on their data handling practices.

When deployed on a **VPS/standalone server**, all data is processed and stored on your own infrastructure. The user is responsible for securing that environment.

## Site owner responsibilities

If you embed the `<simple-likes>` widget on your site, you should:

1. Disclose the use of simplelikes in your own privacy policy
2. Include the suggested disclosure text below (or equivalent)
3. Ensure your privacy policy is easily accessible from pages that use the widget

### Suggested disclosure text

> *This site uses simplelikes, an anonymous like counter. When you click the like button, a cryptographic hash of your browser and IP is temporarily used for rate limiting and deduplication — no personal data is stored, no cookies are set, and no tracking occurs. The only persisted data is the slug identifier and an anonymized visitor token. See [PRIVACY.md](PRIVACY.md) for details.*

## Changes to this policy

Updates to this document will be reflected in the repository. Site owners are encouraged to review it periodically.
