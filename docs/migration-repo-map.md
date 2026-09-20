# Repository map for the Cloudflare Workers migration

> Investigation snapshot: 2026-09-20, `main` at `1de514b` (`origin/main`, zero commits ahead/behind). The worktree was clean when the investigation started. Other agents may have changed it after this snapshot.

## Executive summary

This is a pnpm monorepo with two products that are coupled at build time:

1. `packages/style` is the source design-system package (`@moesegfault/style`). It builds JavaScript, declarations, CSS, design tokens, icons, and self-hosted KaTeX fonts into `packages/style/dist`.
2. `pages` is a statically rendered Astro documentation/showcase site. It consumes the workspace package rather than copying its component implementations. Astro merges the authored site with everything in `pages/public` and emits `pages/dist`.

Static resource distribution is not a separate service today. Generated release assets are committed under `static-releases`, mirrored into the committed `pages/public`, and therefore shipped inside the same GitHub Pages artifact as the documentation site. The current Cloudflare migration can preserve visual behavior by keeping `pages/dist` as the deployment artifact and changing the hosting/deployment layer, but release immutability and cache behavior need explicit treatment.

No Cloudflare or Wrangler configuration was present at the snapshot. The only live-host clues are the Astro canonical site URL, the GitHub Pages `CNAME`, repository documentation, and the GitHub Pages deployment workflow.

## Top-level ownership map

| Path | Role | Source/generated status | Important contracts |
| --- | --- | --- | --- |
| `packages/style/` | Publishable design-system package | `src`, `astro`, and `tokens` are sources; `dist` is generated and ignored | Package version drives static release version; public exports are declared in `packages/style/package.json` |
| `pages/` | Astro docs and showcase | `src` is authored; `public` is partly authored and partly generated/committed; `dist` is generated and ignored | Static output, root-relative URLs, canonical host `https://style.moesegfault.dev` |
| `static-releases/` | Durable static-distribution history | Generated, but committed as the persistent release record | Exact `/v<semver>/` trees are append-only and expected never to change |
| `scripts/` | CDN/release build and verification | Authored | Builds exact releases, mutable aliases, manifests, and the `pages/public` mirror |
| `.github/workflows/ci.yml` | CI and current deployment | Authored | A single workflow verifies then deploys `pages/dist` to GitHub Pages |
| `docs/` | Durable design/usage notes | Authored | Existing notes are partly bilingual; this map is an investigation artifact |

Approximate local snapshot sizes (generated outputs existed locally):

| Tree | Files | Bytes |
| --- | ---: | ---: |
| `packages/style/src` | 39 | 125,684 |
| `packages/style/dist` | 112 | 1,427,113 |
| `pages/src` | 21 | 90,499 |
| `pages/public` | 272 | 4,102,259 |
| `pages/dist` | 355 | 7,003,680 |
| `static-releases` | 267 | 4,095,530 |

The larger `pages/dist` includes Astro output plus copied public resources; it is the current deployable artifact.

## Current build and data flow

```text
packages/style/tokens/tokens.dtcg.json
packages/style/src/**/*
packages/style/astro/**/*
              |
              | pnpm build:library
              v
packages/style/dist
              |
              | pnpm cdn:build
              v
static-releases/v<package version>/    immutable exact release
static-releases/latest, css, tokens,
colors, assets, manifest.json          mutable latest aliases/discovery
              |
              | mirror performed by scripts/build-cdn.mjs
              v
pages/public/{v*,latest,css,tokens,colors,assets,manifest.json}
              +
pages/src + other authored pages/public files
              |
              | pnpm build:pages (astro check && astro build)
              v
pages/dist                            current GitHub Pages artifact
```

### Workspace commands

Root `package.json` requires Node `>=24.0.0` and declares pnpm `11.17.0`.

| Command | Actual behavior |
| --- | --- |
| `pnpm build` | Builds the style library, then the Astro site. It does **not** rebuild static releases. |
| `pnpm build:library` | Runs `packages/style` token/assets generation, Vite build, then declaration compilation. |
| `pnpm cdn:build` | Builds or verifies the exact version tree from `packages/style/dist`, refreshes mutable aliases, then mirrors distribution content into `pages/public`. |
| `pnpm cdn:verify` | Verifies manifests/digests, exact-release discovery, aliases, font assets, and byte equality between `static-releases` and `pages/public`. |
| `pnpm build:pages` | Runs `astro check && astro build`; `pages/astro.config.mjs` sets `output: "static"`. |
| `pnpm test` | Runs style Vitest/type tests, pages Vitest tests, and Node tests for the CDN library. |
| `pnpm test:e2e` | Runs Playwright separately; it is not included in root `test` or the current CI workflow. |
| `pnpm check` | Build + unit/type tests + lint + formatting; it also excludes E2E and CDN build/verification. |

### Style-package build details

- `packages/style/scripts/build-tokens.mjs` validates and resolves DTCG tokens, writes CSS/JSON/TypeScript artifacts, copies icons, and vendors KaTeX fonts/license into `dist/assets`.
- `packages/style/vite.config.ts` builds the package JavaScript entries; `tsconfig.build.json` produces declarations.
- `packages/style/package.json` exports core, React, Astro, rich-text/editor, CSS layers, icons, and token JSON. The current version is `0.1.2`.
- The Astro documentation layout imports `@moesegfault/style/all.css`, Astro primitives, and selected hydrated React components from the same workspace package. This is an important visual-parity property: the showcase is a consumer of the package, not an independent visual fork.

## Site pages and static-resource sources

### Authored page source

`pages/src/pages` contains five Chinese routes and parallel English routes:

| Chinese route | English route | Source purpose |
| --- | --- | --- |
| `/` | `/en/` | Home/showcase |
| `/foundations/` | `/en/foundations/` | Foundations and token usage |
| `/components/` | `/en/components/` | Component, rich-content, glass, and editor demos |
| `/guides/` | `/en/guides/` | Package/CDN integration guidance |
| `/distribution/` | `/en/distribution/` | Static resource paths and version behavior |

Shared page composition lives in:

- `pages/src/layouts/DocsLayout.astro`: canonical/alternate metadata, theme bootstrap, navigation, and footer.
- `pages/src/lib/site.ts`: navigation and locale-path contracts.
- `pages/src/components/*`: Astro and React showcase components.
- `pages/src/styles/*`: documentation-only presentation layered on top of the style package.

Canonical URLs are constructed from `Astro.site`, currently hard-coded as `https://style.moesegfault.dev` in `pages/astro.config.mjs`. Most internal paths and asset URLs are root-relative, so the current artifact assumes deployment at the domain root.

### Authored public files

The non-release content under `pages/public` includes:

- `CNAME` with `style.moesegfault.dev` (GitHub Pages convention).
- `favicon.svg` and `robots.txt`.
- `licenses/` notices for shipped browser assets.

### Generated and committed public distribution

`scripts/build-cdn.mjs` treats `static-releases` as the persistent distribution source and mirrors these entries into `pages/public`:

- every valid exact version directory (`v0.1.0`, `v0.1.1`, `v0.1.2` at the snapshot);
- mutable `latest`, `css`, `tokens`, `colors`, and `assets` trees;
- root `manifest.json`.

The root manifest uses schema version 2 and reports `0.1.2` as both latest and default. Exact release manifests currently enumerate 7 files for `0.1.0`, 10 for `0.1.1`, and 82 for `0.1.2`.

Important behavior:

- Exact `/v<exact-semver>/...` content is immutable.
- `/css`, `/tokens`, `/colors`, `/assets`, and `/latest` follow the greatest stable release.
- Machine-friendly root aliases are direct copies rather than redirects.
- Navigation aliases such as `/latest/` and `/colors/` are generated HTML client redirects because GitHub Pages has no origin redirect configuration. A Worker migration may preserve these HTML responses exactly for zero behavior change, or later replace them with HTTP redirects only after compatibility checks.
- `scripts/verify-release-history.mjs` compares the current Git tree with a base revision and rejects edits/removals to exact release directories that already existed at the base.
- `scripts/verify-cdn.mjs` verifies hashes/inventories and byte equality between `static-releases` and the `pages/public` mirror.

## Current CI and deployment

Only `.github/workflows/ci.yml` exists.

Triggers:

- push to `main`;
- all pull requests;
- manual `workflow_dispatch`.

The `verify` job runs on Ubuntu with Node 24 and pnpm, full Git history, a 10-minute timeout, read-only repository contents permission, and ref-scoped cancel-in-progress concurrency. It performs:

1. frozen dependency installation;
2. style library build;
3. immutable release-history comparison;
4. CDN build and verification;
5. a Git diff/status assertion requiring `static-releases` and `pages/public` generated files to be committed;
6. Astro build;
7. unit/type/Node tests;
8. lint and format checks;
9. upload of `pages/dist` as a GitHub Pages artifact on eligible `main` runs.

The dependent `deploy` job uses `actions/deploy-pages@v5`, grants `pages: write` and `id-token: write`, and deploys into the `github-pages` environment.

Historical note: commit `784a524` merged a separate `.github/workflows/pages.yml` into `ci.yml`. The deleted workflow used to install Chromium and execute `pnpm test:e2e`; that step is absent from current CI even though the Playwright suite remains substantial. Do not assume browser regression coverage currently runs in automation.

## Test map

| Layer | Files/configuration | What it checks |
| --- | --- | --- |
| Style unit/component | `packages/style/src/*.test.ts`, `packages/style/tests/react/*.test.tsx`, `packages/style/vitest.config.ts` | Theme/token build contracts and React component behavior |
| Package type consumer | `packages/style/tests/types/nodenext` | NodeNext export/type consumption; invoked by the style test script after another library build |
| Site unit/SSR | `pages/tests/site.test.ts`, `pages/tests/astro-components.test.ts` | Navigation/theme contracts and Astro component rendering |
| CDN library | `scripts/cdn-lib.test.mjs` | Version discovery, manifests, replacement/rollback behavior, release cases |
| Distribution verifier | `scripts/verify-cdn.mjs` | End-to-end filesystem invariants for committed releases and the public mirror |
| Browser E2E | `pages/tests/*.e2e.ts`, configured by `pages/playwright.config.ts` | Language/theme navigation, accessibility behaviors, visual/overflow checks, rich content/fonts, glass, editor behavior, Chromium desktop and iPhone 13 emulation |

Playwright builds the Astro site and serves it with Vite preview on `127.0.0.1:4377`. In CI mode it retries twice. These tests validate the built site, but not Worker-specific routing, response headers, caching, or a deployed Cloudflare hostname.

## Domain and Cloudflare clues

Observed repository evidence:

- Canonical domain: `style.moesegfault.dev` in `pages/astro.config.mjs`, README examples, page tests, and `pages/public/CNAME`.
- Current platform: GitHub Pages, explicitly named in the workflow and project documentation.
- Git remote: `https://github.com/kleedaisuki/moesegfault-style.git`.
- No `wrangler.toml`, `wrangler.json/jsonc`, Worker entrypoint, Cloudflare Pages configuration, zone/account identifier, routes, or Cloudflare deployment action existed at the snapshot.
- No repository evidence establishes the current DNS record type or Cloudflare zone state. That must be inspected independently with the authorized CLI before cutover.

## Git state and history

- Snapshot branch: `main` at `1de514b`, tracking `origin/main`, ahead/behind `0/0`.
- Snapshot worktree: clean, including untracked files.
- No tags exist; releases are represented by package versions and committed static directories rather than Git tags.
- The repository began at `901c1d3` on 2026-09-02. Static distribution and GitHub Pages deployment were introduced immediately afterward and then hardened through append-only history checks, canonical release discovery, and public mirroring.
- Recent history (2026-09-07 through 2026-09-08) added glass/motion/rich-content/editor functionality and expanded `v0.1.2`; this makes the current browser regression suite particularly relevant to visual-parity claims.

## Migration risks and recommendations

These are architecture/release risks, not a security audit.

| Priority | Risk | Evidence | Recommendation |
| --- | --- | --- | --- |
| High | A deployment rewrite can silently omit distribution files or serve a different tree than local Astro. | The public API is physically embedded in `pages/dist` through the `pages/public` mirror. | Keep one deployment artifact (`pages/dist`) initially. Add a post-build inventory assertion for exact versions, mutable aliases, and the new skill resource before switching traffic. |
| High | Exact-version immutability could be weakened by platform cache/routing changes. | Consumers are told that `/v<exact-semver>/...` never changes; Git checks protect source history but not response policy. | Assign long-lived immutable caching only to exact-version paths. Keep mutable aliases and HTML on independently appropriate cache policies. Validate bytes/content types at the deployed Worker. |
| High | Browser regressions are currently not a required CI gate. | Current `ci.yml` calls `pnpm test`, not `pnpm test:e2e`; the old separate workflow did run E2E. | Restore Chromium installation and `pnpm test:e2e` before or alongside migration; retain desktop and mobile projects. Add a small Worker-routing smoke test rather than duplicating the entire browser suite. |
| Medium | GitHub Pages-specific client redirect pages may be mistaken for Worker routing requirements. | `writeRedirect` explicitly generates HTML redirects for GitHub Pages. | Preserve them during the first cutover to avoid user-visible changes. If later converted to origin redirects, test query/fragment behavior and documented URLs first. |
| Medium | `pages/public` duplicates generated release data and can drift if build steps are reordered. | CDN build updates both `static-releases` and the committed public mirror; root `build` does not run it. | During migration, keep the existing verifier. Consider a later single-source build that copies `static-releases` only into a staging artifact, but do not combine that refactor with the hosting cutover. |
| Medium | The requested skill needs a clear source-versus-distribution contract. | No `skills/` path exists and the CDN builder only knows release directories plus fixed mutable aliases. | Author the skill once under root `skills/<name>/`. Add an explicit build/copy step into the deployed artifact and a test comparing the distributed bytes to the source; avoid manually maintained duplicate copies. Decide and document its stable URL. |
| Medium | Cutover configuration cannot be inferred from this repository. | No Cloudflare account/zone/route configuration is committed. | Inspect the authorized zone, choose the Worker name and custom-domain attachment, and record non-secret identifiers/configuration in the repository before deployment. Keep credentials in GitHub environment secrets or use supported identity federation. |
| Low | The obsolete `CNAME` file will remain in the static artifact after leaving GitHub Pages. | Astro copies `pages/public/CNAME` into `pages/dist/CNAME`. | Remove it only when the GitHub Pages deployment is retired; it is inert on Workers but misleading to maintainers. |
| Low | Hard-coded host references make preview/custom-domain validation less flexible. | Astro `site`, docs snippets, and tests name the production host. | Preserve the production canonical host. Parameterize only if preview builds actually need canonical variation; avoid unnecessary abstraction during cutover. |

## Suggested implementation boundaries

To minimize concurrent-edit conflicts:

1. **Skill authoring:** own only `skills/<skill-name>/` plus its focused validation.
2. **Static distribution integration:** own a dedicated copy/build script and the minimal package-script/tests needed to place the skill in `pages/dist`; avoid changing style release semantics unless the skill is explicitly versioned with the package.
3. **Worker hosting:** own Wrangler configuration and any Worker entrypoint/static-asset binding.
4. **CI/deployment:** own `.github/workflows/ci.yml` (or a new focused deploy workflow), preserving the existing verification sequence.
5. **DNS/cutover:** treat zone changes as an operational step after preview validation; do not encode guessed DNS state from repository evidence.

The lowest-risk first migration is intentionally boring: continue producing `pages/dist`, serve that exact directory through Cloudflare Workers static assets, preserve every current route and body, reinstate browser E2E, validate deployed resource bytes and content types, and only then move the custom domain.
