# Cloudflare Workers migration validation results

## Verdict

**PASS for the local P0 acceptance gate and ready for an authorized production
deployment.** Production DNS/cutover behavior and the GitHub-hosted workflow runs
remain unobserved and require the post-deployment smoke check before the migration
can receive an unconditional production verdict.

Validation date: 2026-09-20 (Asia/Singapore)

## Environment

| Item | Observed value |
| --- | --- |
| Repository | `D:\Code\moesegfault-style` |
| Candidate | Shared working tree containing the Workers/skill migration; not yet committed during validation |
| Node used by test/build processes | `v26.8.2` |
| pnpm used | `11.25.0` from the Codex runtime fallback |
| Declared package manager | `pnpm@11.17.0` |
| Wrangler | `4.135.0` |
| Local Worker | `http://127.0.0.1:8791` |
| Browser projects | Desktop Chromium and the configured mobile WebKit project |

The user's global pnpm shim pointed to a missing executable. Validation prepended
the repository runtime's fallback pnpm to `PATH`; this was an environment failure,
not an implementation failure. The project itself still completed under a pnpm
version newer than the declared version.

## Result summary

| Area | Result | Evidence |
| --- | --- | --- |
| Library/static/site build | PASS | Library build, CDN build/verify, skill build, Astro check/build all exited 0; 10 pages generated. |
| Unit and contract tests | PASS | Style Vitest: 85/85; Pages Vitest: 10/10; Node contract tests: 12/12. |
| Lint and formatting | PASS | Biome lint checked 111 files; formatter checked 109 files; no errors. |
| Package compatibility | PASS | `pack:check` produced the expected `@moesegfault/style@0.1.2` file inventory. |
| Skill source/package | PASS | `quick_validate.py` passed for source and extracted download; archive has 4 source files and matches them by relative path and SHA-256. |
| Skill reproducibility | PASS | After the final forward-test revision and cross-platform LF normalization, repeated builds produced SHA-256 `40c2be1da1b6bb01d36aa2aab72a0ccb62bba6275f1ff71ab1f3b47b8764765b`. |
| Worker dry run | PASS | Wrangler read 408 static files, found no bindings, and exited cleanly without publishing. |
| Worker HTTP inventory | PASS | 130 local HTTP contracts across 3 exact releases, aliases, 10 site routes, skill files, GET/HEAD behavior, slash redirects, and a real 404 passed. |
| Worker browser behavior | PASS | 59 Playwright tests passed against Wrangler itself; one forced-colors test was intentionally skipped for non-Chromium mobile. |
| Cache/CORS behavior | PASS | Local Worker parsed 3 header rules; exact release CSS was immutable, HTML/aliases/skill downloads revalidated, and resources had wildcard CORS. |
| GitHub Actions static validation | PASS with external corroboration | Both YAML files parsed locally; the CI implementation agent independently reported `actionlint` passing. No hosted run existed during this validation. |
| Production custom domain | NOT RUN | Requires authorized deployment and post-cutover smoke validation. |

## Commands and observations

### Build and regression checks

The global pnpm shim was bypassed for all `pnpm` commands as follows:

```powershell
$env:PATH = 'C:\Users\STONE\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;' + $env:PATH
```

The following project commands passed:

```text
pnpm build:library
pnpm cdn:build
pnpm cdn:verify
pnpm skill:build
pnpm build:pages
pnpm test
pnpm lint
pnpm format:check
pnpm pack:check
```

Important output:

- `CDN v0.1.2: 82 files -> pages/public`
- `Verified CDN 0.1.2: 3 exact releases and latest`
- `Skill downloads: 1 -> pages/public/skills`
- Astro check: 29 files, 0 errors, 0 warnings, 0 hints
- Astro build: 10 pages
- style tests: 10 files / 85 tests passed
- pages tests: 3 files / 10 tests passed
- Node tests: 12 passed
- lint: 111 files, no fixes
- format: 109 files, no fixes

The first formatting attempt found that a Wrangler-generated file under `.temp`
was being included by Biome. That was a real reproducibility defect: running a dry
run could make a later format check fail. The implementation was corrected by
ignoring `.temp/` and `.wrangler/` in Git and excluding them in Biome. Independent
revalidation then passed. No production code was changed by the validator.

### Skill validation and download equivalence

Commands:

```text
python C:/Users/STONE/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/moesegfault-style
node --test scripts/build-skill-downloads.test.mjs
pnpm skill:build
tar -tf pages/public/skills/moesegfault-style.zip
```

Observed archive layout:

```text
moesegfault-style/SKILL.md
moesegfault-style/agents/openai.yaml
moesegfault-style/references/capabilities.md
moesegfault-style/references/integration.md
```

The archive was expanded under `.temp/validation/`. Its four normalized paths and
SHA-256 hashes exactly matched `skills/moesegfault-style`, and the extracted skill
also passed `quick_validate.py`. The sidecar checksum matched both the local archive
and a fresh HTTP download from the Wrangler server. Rebuilding the download did not
change the archive hash.

The entry skill is capability-oriented rather than a duplicated API manual. It
routes agents among CSS/tokens, React, Astro, and versioned static assets, while
moving detailed integration and component selection into two focused references.
Examples were checked against the current package exports and token CSS.

### Worker dry run

Command:

```text
pnpm workers:dry-run
```

Result:

```text
Wrangler 4.135.0
Read 408 files from pages/dist
Total Upload: 0.36 KiB / gzip: 0.25 KiB
No bindings found.
--dry-run: exiting now.
```

No deployment, route mutation, or DNS mutation occurred.

### Worker HTTP inventory

Wrangler was started after a clean build:

```text
pnpm exec wrangler dev --local --ip 127.0.0.1 --port 8791
```

The local server parsed three `_headers` rules. A validator under
`.temp/validation/http-inventory.mjs` then:

- loaded the root release manifest;
- enumerated all files in every exact-version manifest;
- compared every HTTP body byte-for-byte with `pages/dist`;
- checked corresponding `HEAD` status and media type;
- checked root CSS/token/color/icon/font aliases;
- checked all four skill distribution endpoints;
- checked all ten Chinese/English site routes;
- checked `/components` and `/colors` slash redirects;
- asserted a definitely missing path returned 404 rather than an HTML fallback.

Result:

```text
Validated 130 HTTP contracts (3 releases).
```

Representative observed headers:

| URL | Status | Content type | Cache behavior |
| --- | --- | --- | --- |
| `/` | 200 | `text/html; charset=utf-8` | `max-age=0, must-revalidate` |
| `/components` | 307 to `/components/` | redirect | no long-lived HTML cache |
| `/manifest.json` | 200 | `application/json` | `max-age=0, must-revalidate` |
| `/v0.1.2/css/all.css` | 200 | `text/css; charset=utf-8` | `max-age=31536000, immutable` |
| `/skills/moesegfault-style.zip` | 200 | `application/zip` | `max-age=0, must-revalidate` |
| unknown path | 404 | not a successful home-page fallback | n/a |

All representative responses included `Access-Control-Allow-Origin: *` as intended.

Cloudflare's `auto-trailing-slash` handling returns a 307 from an explicit
`/vX.Y.Z/index.html` URL to `/vX.Y.Z/`; following the redirect returns the exact
committed HTML bytes. This preserves reachability and content but is a status-chain
change worth retaining in the release notes and production smoke check.

### Browser behavior and visual regressions on the Worker runtime

A temporary Playwright config disabled the normal Vite web server and pointed the
existing suite to `http://127.0.0.1:8791`. Command:

```text
pnpm --filter @moesegfault/pages exec playwright test --config ../.temp/validation/playwright.worker.config.ts
```

Result:

```text
59 passed
1 skipped
duration: 56.0s
```

The single skip is the suite's declared forced-colors restriction to Chromium; it
is expected for the mobile WebKit project. Passing coverage included all Chinese
and English routes, language switching, persisted theme, keyboard focus, reduced
motion, rich content, self-hosted mathematics fonts, editor behavior, mobile
overflow, and the existing full-page/component screenshot captures. Wrangler logs
showed successful requests for page, CSS, JavaScript, font, icon, and rich-content
assets without an unhandled runtime exception during this stable-server run.

One diagnostic run rebuilt `pages/dist` while Wrangler's file watcher was already
serving it. Wrangler observed Astro's transient removal of `.prerender/chunks` and
exited with `ENOENT`. Starting it again after the build required no repair and the
entire HTTP/browser suite passed. The documented `workers:dev` command builds
before starting Wrangler, so this does not affect its claimed workflow; maintainers
should not run a second site build concurrently with an active local dev server.

### GitHub Actions and documentation

Local YAML parsing command:

```text
python -c "import yaml, pathlib; [print(p, type(yaml.safe_load(pathlib.Path(p).read_text(encoding='utf-8'))).__name__) for p in ['.github/workflows/ci.yml','.github/workflows/deploy.yml']]"
```

Both documents parsed as mappings. The CI implementation agent separately ran
`actionlint` successfully. Inspection confirmed:

- frozen pnpm installation and pinned action revisions;
- build/test/CDN/skill/E2E/lint/format/Workers dry-run verification in CI;
- both Chromium and WebKit are installed for the two configured projects;
- the verified `pages/dist` artifact is uploaded only for a successful main push;
- deployment consumes that artifact and exact verified commit rather than rebuilding;
- the deploy workflow requires a successful main-branch push CI run;
- production deployment concurrency does not cancel an in-progress deployment;
- Cloudflare token and account identifier are injected through a secret and variable;
- legacy GitHub Pages deploy actions and Pages write permissions are absent.

The README, contributor guide, bilingual distribution pages, and Workers migration
document agree on the skill URLs, dry-run command, deployment credentials, custom
domain, and rollback approach. Historical GitHub Pages references remain only where
they explain rollback or generation compatibility, not as current deployment steps.

## Remaining uncertainty and required production check

The following could not be proven before deployment and are not silently treated as
passing:

1. GitHub Actions has not yet executed the new workflows on GitHub-hosted runners.
2. Cloudflare API credentials, account identifier, custom-domain ownership, and the
   resulting production deployment identifier were not exercised.
3. DNS propagation and HTTPS behavior at `style.moesegfault.dev` were not changed or
   tested as part of this non-mutating validation.
4. Visual evidence was generated by the existing screenshot-producing tests, which
   assert layout/behavior but do not use committed pixel-golden comparisons.

After the authorized deployment, repeat the route/resource inventory, the skill
download hash check, representative cache/CORS checks, real 404 check, and the
non-mutating browser suite against `https://style.moesegfault.dev`. Record the
workflow run URL, deployment identifier, commit SHA, and DNS observation before
upgrading the verdict to unconditional production acceptance.
