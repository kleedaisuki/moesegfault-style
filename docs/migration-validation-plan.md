# Cloudflare Workers migration validation plan

## Purpose and decision rule

This plan validates the migration of `style.moesegfault.dev` from GitHub Pages to
Cloudflare Workers, the addition of an agent-facing MoeSegfault Style skill, and
distribution of that skill as a static download. It is intentionally independent
of the implementation: commands that depend on the final scripts are identified
by capability, not by a presumed internal layout.

The migration is accepted only when every **P0** check passes. A **P1** failure
blocks acceptance unless it is documented with a narrow, user-approved exception.
Screenshots alone are diagnostic evidence; behavior assertions and byte/digest
comparisons remain the source of truth.

This is a functional and compatibility validation plan, not a security audit.

## Scope and invariants

| Area | Invariant | Priority |
| --- | --- | --- |
| Site | The same Chinese and English routes render with the same content, theme behavior, responsive layout, and accessibility behavior. | P0 |
| Static resources | Existing public URLs keep their path semantics, bytes, media types, and redirect behavior. Exact-version releases remain immutable. | P0 |
| Skill source | A concise, agent-facing skill exists under `skills/`, has valid metadata, and gives an agent enough guidance to use the style without reproducing the entire product documentation. | P0 |
| Skill download | A documented public URL returns a complete, extractable copy of the skill whose files match the repository source. | P0 |
| Worker | A clean build can be served by the Workers runtime locally and can complete a deployment dry run without credentials or production mutation. | P0 |
| CI/deployment | Workflow syntax is valid, pull requests execute verification without deployment credentials, and deployment is limited to the intended branch/event/environment. | P0 |
| Documentation | Contributor, deployment, migration, and skill download instructions agree with executable scripts and the actual URL contract. | P1 |

Out of scope: npm API redesign, changes to the visual language, performance
optimization, production DNS cutover itself, and independent security review.

## Evidence handling

Keep generated validation artifacts inside the repository in `.temp/validation/`
and caches in `.cache/`. Do not commit those artifacts. Record:

- commit SHA and dirty working-tree status;
- Node and pnpm versions;
- browser and Wrangler versions;
- every exact command and exit code;
- local server logs, HTTP response headers, redirect chains, and screenshots;
- SHA-256 inventories used for before/after comparisons.

The comparison baseline should be captured from the last known-good pre-migration
commit or a clean worktree at that commit. Do not use the current production site
as the only baseline: caches and an in-progress DNS cutover can make it ambiguous.
Store baseline and candidate outputs separately:

```text
.temp/validation/
  baseline/
    dist/
    inventory.sha256
    screenshots/
  candidate/
    dist/
    inventory.sha256
    screenshots/
    worker.log
  skill-download/
  results.md
```

## Preconditions

1. Start from a clean checkout and install with the lockfile:

   ```sh
   corepack enable
   pnpm install --frozen-lockfile
   git status --short
   node --version
   pnpm --version
   ```

2. Install the Playwright browser required by the existing suite if the machine
   does not already have it:

   ```sh
   pnpm --filter @moesegfault/pages exec playwright install chromium
   ```

3. Identify and record:
   - the baseline commit;
   - the candidate commit;
   - the Worker preview command and port;
   - the repository skill directory;
   - the canonical public skill download URL;
   - whether the distributed form is a directory, archive, or both.

4. Run destructive build commands only in the checkout or a worktree. Do not
   invoke a production deployment while executing this plan.

## Acceptance matrix

### 1. Clean build and existing regression suite

Run the existing project contract first. This separates migration defects from
pre-existing library or documentation failures.

```sh
pnpm build:library
pnpm cdn:build
pnpm cdn:verify
pnpm build:pages
pnpm test
pnpm lint
pnpm format:check
pnpm pack:check
pnpm test:e2e
```

Pass criteria:

- every command exits zero;
- generated release files are committed and reproducible:

  ```sh
  git diff --exit-code -- static-releases pages/public
  test -z "$(git status --porcelain --untracked-files=all -- static-releases pages/public)"
  ```

- existing Playwright checks pass for desktop Chromium and the configured mobile
  project, including localization, navigation, persisted theme, reduced motion,
  forced colors, rich content, editor interaction, keyboard focus, font loading,
  and horizontal overflow;
- the package tarball check demonstrates that published package exports still
  resolve. The new skill must not accidentally change this library contract.

On Windows, run the project commands unchanged and perform the clean-tree check
with `git status --porcelain --untracked-files=all -- static-releases pages/public`.

### 2. Static site equivalence

Build both baseline and candidate from clean worktrees with the same Node/pnpm
versions. Compare the generated site inventories after excluding only intentional
hosting metadata documented by the implementation (for example a removed Pages
`CNAME`). Do not broadly ignore HTML, CSS, JavaScript, fonts, manifests, or icons.

For every route below, request both `/path` and `/path/` and record the final URL,
status, content type, and redirect chain:

```text
/
/foundations/
/components/
/guides/
/distribution/
/en/
/en/foundations/
/en/components/
/en/guides/
/en/distribution/
```

Pass criteria:

- canonical trailing-slash behavior is the same as before the migration;
- all final HTML responses are successful and use `text/html`;
- internal navigation, canonical links, alternate-language links, favicon paths,
  and asset references remain on `https://style.moesegfault.dev`;
- no browser console error, page error, failed same-origin request, or missing font
  is observed;
- all existing E2E behavior assertions pass against the Worker preview URL, not
  merely Astro/Vite preview;
- desktop and mobile screenshots have no unexplained visual differences.

For visual comparison, capture at fixed viewports, device scale factor, locale,
color scheme, reduced-motion setting, and browser version. At minimum capture all
ten routes in light mode, both component galleries in dark mode, and the existing
glass/messages/code component close-ups. Mask only genuinely nondeterministic
content. Any threshold-based pixel diff must also receive human inspection;
thresholds must not be raised merely to make a regression pass.

### 3. Static resource URL compatibility

Treat the existing resource paths as public API. At minimum probe:

```text
/manifest.json
/v0.1.0/manifest.json
/v0.1.1/manifest.json
/v0.1.2/manifest.json
/v0.1.2/css/all.css
/v0.1.2/tokens/tokens.json
/latest/
/latest/css/all.css
/css/all.css
/tokens/tokens.json
/colors
/colors/
/colors/colors.css
/colors/colors.json
/assets/icons/brand.svg
/assets/katex/fonts/KaTeX_Main-Regular.woff2
/favicon.svg
/robots.txt
```

Also enumerate every file named by the root and exact-version manifests and probe
it through the Worker. Use `curl --fail-with-body --location --dump-header` (or an
equivalent HTTP client) and save response bodies to `.temp/validation/candidate/`.

Pass criteria:

- all manifest-listed URLs return 200 after the documented redirect behavior;
- exact-version response bodies are byte-for-byte equal to the corresponding
  committed files and match the manifest digest/integrity metadata;
- `/latest/` and `/colors/` retain their documented exact-version target;
- root machine-resource aliases return bodies equal to the current stable release;
- JSON is parseable, CSS is non-empty, SVG and font resources are not served as
  HTML fallbacks, and media types are appropriate;
- a definitely missing path returns a genuine 404 and not the home page with 200;
- query strings do not change resource selection or corrupt the response;
- `GET` and `HEAD` agree on status, content type, content length when present, and
  redirect target;
- no already published exact-version file changes relative to the baseline.

Hosting headers may improve under Cloudflare, but body and URL compatibility take
precedence. Record cache headers for exact versions, mutable aliases, and HTML so
the deployment documentation can state the observed policy; do not infer policy
from configuration alone.

### 4. Skill source quality and agent usability

Validate the repository skill using the validator supplied by the installed
skill-creation tooling when available. Also inspect it independently.

Pass criteria:

- the skill is under `skills/<skill-name>/SKILL.md` and required frontmatter parses;
- its name and description make the trigger boundary clear to an agent;
- referenced files exist, relative links do not escape the skill, and there are no
  machine-local absolute paths;
- the instructions state the style's stable primitives, constraints, and a short
  workflow, while detailed catalogs remain in referenced material rather than
  bloating the entry document;
- examples use current package exports and current static resource URLs;
- the skill distinguishes package-manager use from remote CSS/token use;
- the skill does not require network access when the local package or bundled
  references are sufficient.

Perform at least three scenario evaluations in a disposable directory:

| Scenario | Expected skill behavior |
| --- | --- |
| Add MoeSegfault styling to a React page | Chooses the React/package entry points and imports the minimum required CSS without inventing APIs. |
| Style a plain static HTML page | Uses a pinned static CSS URL (or a clearly documented local alternative), semantic markup, theme tokens, and no React dependency. |
| Modify an Astro documentation page | Selects supported Astro primitives, preserves accessibility/theme behavior, and points to deeper references only when needed. |

For each scenario, save the prompt, response, and a factual checklist. Acceptance
requires no nonexistent export, class, token, or URL and no contradiction with the
package README. The goal is correct capability abstraction, not verbatim recall of
all components.

### 5. Skill static distribution

Download the canonical skill asset from the local Worker preview, then repeat
against the deployed host after cutover. Never validate only the repository copy.

Pass criteria:

- the documented URL returns 200 without authentication;
- `Content-Type` and optional download filename match the distributed format;
- the payload is non-empty and can be extracted, if archived, without warnings;
- the extracted root has the expected skill layout and passes the same structural
  validator as `skills/<skill-name>`;
- normalized relative file paths and SHA-256 hashes exactly match the repository
  skill source (archive container metadata such as timestamps may differ only if
  the build does not promise reproducible archive bytes);
- all files referenced by `SKILL.md` are present in the download;
- a clean agent skills directory can receive the extracted folder without manual
  path repair;
- rebuilding twice from the same commit produces the same file inventory and,
  where reproducible packaging is claimed, the same archive digest;
- documentation links to the same URL tested here.

### 6. Workers local runtime and deployment dry run

Use the final repository scripts where provided. The equivalent low-level checks
are:

```sh
# Build all deployable output from a clean checkout.
pnpm build

# Validate Wrangler configuration and produce a bundle without publishing.
pnpm exec wrangler deploy --dry-run

# Start the actual Worker runtime locally; bind to loopback and capture logs.
pnpm exec wrangler dev --local --ip 127.0.0.1 --port 8787
```

If the project uses a named Wrangler configuration, environment, or wrapper
script, use that documented form instead. A dry run must not require a Cloudflare
API token and must not change routes, DNS, or deployed Workers.

Pass criteria:

- build and dry run exit zero from a clean checkout;
- the dry-run output identifies the intended Worker and static asset directory;
- no generated path points outside the repository;
- the local Worker serves every site, release, and skill URL in this plan;
- direct navigation and reload on nested HTML routes work;
- concurrent requests for representative HTML, CSS, JSON, font, icon, and skill
  assets complete successfully without intermittent 5xx responses;
- server logs contain no unhandled exception during the full HTTP/E2E suite;
- stop/start of the local Worker does not require deleting generated state or
  manually repairing output.

### 7. GitHub Actions syntax and behavior

Validate every workflow with a dedicated GitHub Actions linter such as
`actionlint` (prefer a pinned development dependency or pinned CI action), then
exercise the workflow on a pull request. YAML parsing alone is insufficient because
it does not understand Actions expressions and event semantics.

Pass criteria:

- workflow files parse and `actionlint` reports no error;
- referenced package scripts exist and succeed on `ubuntu-latest` with the pinned
  Node and pnpm versions;
- dependency installation uses the frozen lockfile;
- pull requests run build, tests, CDN verification, skill validation/packaging,
  Worker dry run, lint, and formatting without Cloudflare credentials;
- pull requests and non-deployment branches cannot execute the deploy step;
- the deploy job depends on all verification jobs and targets only the documented
  branch/event/environment;
- the workflow uploads or deploys the same built artifact that was verified, rather
  than rebuilding an unverified variant;
- GitHub Pages deployment steps and Pages-specific permissions/artifacts are gone
  unless explicitly retained for an intentional compatibility reason;
- action versions, Wrangler version, Node version, and pnpm version are pinned by
  workflow or lockfile as documented;
- required Cloudflare variable/secret names are documented, while secret values are
  absent from source and logs;
- concurrency behavior cannot cancel an in-progress production deployment halfway
  through while marking the replacement run successful without verification.

Final proof is one successful pull-request workflow and one successful deployment
workflow run from the intended branch. Save run URLs and commit SHA in the release
record.

### 8. Documentation consistency

Read the root README, package README, contribution guide, distribution pages in
both languages, and any new deployment/skill documentation as one contract.

Pass criteria:

- no current instruction calls GitHub Pages the active host;
- Cloudflare Workers build, local preview, dry run, deployment, rollback, custom
  domain/route ownership, and required CI variables are documented at the level a
  maintainer needs;
- public consumers still see the existing static URL contract and are not told to
  migrate URLs unnecessarily;
- the skill source path, download URL, format, installation steps, update model,
  and intended agent trigger are explicit and identical across documentation;
- all copied commands work from the documented directory on a clean checkout;
- Chinese and English site distribution pages agree on versions, paths, and cache
  semantics;
- removed Pages files, commands, permissions, or limitations are not presented as
  current behavior;
- license and third-party notice files needed by either the static site or skill
  package remain reachable.

## Post-deployment smoke check

Run only after the authorized production deployment and route/DNS cutover:

1. Resolve `style.moesegfault.dev` from at least two independent resolvers and
   record the result. This is evidence of cutover, not a reason to alter content.
2. Repeat the route matrix, manifest enumeration, representative `GET`/`HEAD`
   checks, missing-path check, and skill download check against HTTPS production.
3. Run the non-mutating Playwright documentation/visual suite against production
   or an equivalent smoke configuration.
4. Compare exact-version assets against the committed baseline by SHA-256.
5. Confirm canonical and alternate-language URLs still use the custom domain.
6. Record Cloudflare deployment identifier, Git commit, workflow run, timestamp,
   and results. Do not rely on dashboard status alone.

If a P0 regression is found, preserve the failed evidence, revert the Worker route
to the last known-good deployment using the documented rollback procedure, and
repeat the affected checks plus the complete P0 matrix. Do not repair compatibility
by changing an existing exact-version URL.

## Result report template

```markdown
# Migration validation result

- Candidate commit:
- Baseline commit:
- Environment (OS / Node / pnpm / Wrangler / browser):
- Worker preview command and URL:
- Production deployment ID (if applicable):
- GitHub Actions run URLs:

| Area | Result | Command/evidence | Notes |
| --- | --- | --- | --- |
| Clean build and regression suite | PASS/FAIL | | |
| Site and visual equivalence | PASS/FAIL | | |
| Static URL compatibility | PASS/FAIL | | |
| Skill source and scenario evaluations | PASS/FAIL | | |
| Skill download equivalence | PASS/FAIL | | |
| Worker local runtime/dry run | PASS/FAIL | | |
| GitHub Actions | PASS/FAIL | | |
| Documentation | PASS/FAIL | | |
| Production smoke check | PASS/FAIL/N/A | | |

## Deviations and residual uncertainty

## Verdict

ACCEPT / REJECT
```

An `ACCEPT` verdict must cite concrete evidence for every P0 row. A passing build
alone is not evidence of site equivalence, and a successful deployment alone is
not evidence of URL or skill-download compatibility.
