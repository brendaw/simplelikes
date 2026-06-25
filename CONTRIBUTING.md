# Contributing to simplelikes

Contributions are welcome — bug fixes, improvements, and new features.

For bug reports or feature requests, [open an Issue](https://github.com/brendaw/simplelikes/issues) first so the approach can be discussed before you start coding.

## Prerequisites

- Node.js 22+
- npm
- A Cloudflare account (for deployment; not required for local development)

## How to contribute

1. Fork the repository and clone your fork.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local dev server:
   ```bash
   npm run dev
   ```
4. Make your changes.
5. Run tests:
   ```bash
   npm test
   ```
6. Open a Pull Request against `main`.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
type: short description
```

Types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`, `style`, `test`, `perf`.

## Code style

The repository includes an `.editorconfig` file:

- UTF-8, LF line endings
- 2-space indentation for `.ts`, `.js`, `.json`
- Tab indentation for `.sh` scripts
- Final newline and no trailing whitespace

---

Maintainers: see [RELEASING.md](RELEASING.md) for the build and release process.

[Back to README](README.md)
