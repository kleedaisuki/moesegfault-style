# Cloudflare Workers static-site migration architecture

Status: proposed production architecture
Decision date: 2026-09-20
Scope: hosting and distribution only; this is not an independent security audit

## Executive decision

Deploy the existing Astro output, `pages/dist`, as one **Cloudflare Workers Static
Assets** project. Do not add a Worker script, an assets binding, R2, KV, or a second
distribution service. The site, existing CSS/token/font release trees, and the new
agent skill downloads are all files in the same build artifact and therefore move
through one atomic Worker version.

The production hostname should be a Worker **Custom Domain** for
`style.moesegfault.dev`. A Custom Domain is the appropriate Cloudflare primitive
when the Worker is the origin; a Worker Route is intended for code that runs in
front of another origin. Cloudflare also recommends Workers Static Assets, rather
than Pages, for new static sites. See [Workers best practices], [Static Assets],
and [Custom Domains].

This is intentionally a hosting substitution, not a site rewrite:

```text
skills/moesegfault-style/** -----------------------+
                                                     |
packages/style -> static-releases -> pages/public --+--> Astro --> pages/dist
pages/src ------------------------------------------+               |
                                                                    v
                                                       Workers Static Assets
                                                                    |
                                                     style.moesegfault.dev
```

The visual implementation remains owned by Astro and `@moesegfault/style`.
Cloudflare receives exactly the already-tested `pages/dist` tree and does not
transform HTML, CSS, JavaScript, or images at request time.

## Evidence and current boundaries

At the investigation snapshot, the repository has these relevant properties:

| Boundary | Observation | Architectural consequence |
| --- | --- | --- |
| Site rendering | `pages/astro.config.mjs` uses `output: "static"` and canonical site `https://style.moesegfault.dev`. | No server-side Worker code is required. |
| Deployable tree | `pages/dist` contains 355 files, about 7.0 MB total; its largest file is about 1.23 MB. | This is well below the documented Static Assets limits of 20,000 files on Workers Free (100,000 paid) and 25 MiB per file. |
| Release data | `static-releases/v<semver>` is append-only and is mirrored into `pages/public`; root aliases such as `/latest`, `/css`, and `/tokens` are mutable. | Cache exact versions and mutable aliases differently; never create a second release store. |
| Current DNS | On 2026-09-20, public DNS resolved `style.moesegfault.dev` as a CNAME to `kleedaisuki.github.io`, and live responses came from GitHub Pages. | The CNAME conflicts with a Worker Custom Domain and must be replaced during the cutover. |
| Existing path behavior | GitHub Pages redirects directory paths such as `/guides` to `/guides/`; generated `/latest/` and `/colors/` pages perform their own client redirect to an exact version. | Keep the generated pages, and use Static Assets' default directory-index handling. |
| Existing cross-origin behavior | GitHub Pages currently returns `Access-Control-Allow-Origin: *`. | Retain wildcard CORS for the public artifact tree so font, JSON, CSS, and agent consumers do not regress. |

The measured artifact also fits Cloudflare's current platform limits with ample
headroom; see [Workers platform limits]. Static-asset requests are documented as
free and unlimited and asset storage has no additional charge, while Worker-script
invocations are metered. This reinforces the script-free design; see [Static
Assets billing and limitations]. These are current platform claims, not a future
capacity guarantee, so CI should still count files and reject any file above the
platform limit.

## Invariants and ownership

### Data ownership

1. `packages/style` owns library implementation and design-system releases.
2. `static-releases` owns the durable, append-only history of exact library
   releases.
3. `skills/moesegfault-style` owns the installable agent skill source. Its
   lifecycle is independent of the library SemVer lifecycle.
4. `scripts/build-skill-downloads.mjs` (or its final equivalent) owns deterministic
   skill packaging into `pages/public`.
5. Astro owns the final static-tree composition. `pages/dist` is the only deploy
   input.
6. Wrangler owns Worker configuration and domain attachment. The Cloudflare
   dashboard must not become a second configuration source.

### Public compatibility invariants

| URL class | Invariant |
| --- | --- |
| `/`, documentation routes, and `/en/...` | Same built HTML, CSS, scripts, interactions, canonical links, and theme behavior. |
| `/v<exact-semver>/...` | Published bytes are immutable and the URL must never disappear. |
| `/latest/...`, `/css/...`, `/tokens/...`, `/colors/...`, `/assets/...` | Mutable aliases may advance only through the existing release builder. |
| `/skills/moesegfault-style/SKILL.md` | Stable, mutable entry to the current plain-text skill. |
| `/skills/moesegfault-style.zip` | Stable, mutable download of the complete installable skill directory. |
| `/skills/manifest.json` | Discovery document containing a source-content version, file inventory, and digests for the current skill artifacts. |
| Missing paths | A real 404; never an SPA fallback with `200 OK`. |

Do **not** add `/v<library-semver>/skills/...`. The skill is an agent capability
description, not a library artifact, and tying its release clock to the style
package would create a false compatibility promise.

## Selected Worker configuration

Use a root `wrangler.jsonc` as the checked-in source of truth. The essential shape
is:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "moesegfault-style",
  "compatibility_date": "2026-09-20",
  "workers_dev": false,
  "preview_urls": true,
  "routes": [
    {
      "pattern": "style.moesegfault.dev",
      "custom_domain": true
    }
  ],
  "assets": {
    "directory": "./pages/dist",
    "html_handling": "auto-trailing-slash"
  }
}
```

The final Worker name may differ if that name is already allocated, but it should
then be changed once in both configuration and operational documentation.

Important absences are deliberate:

- no `main`: there is no request handler to execute;
- no `assets.binding`: bindings are useful only when Worker code fetches assets;
- no `run_worker_first`: it would add a metered compute path and another failure
  mode to every static request;
- no `not_found_handling: "single-page-application"`: this is a statically
  generated multi-page site, and missing machine resources must remain 404s;
- no R2/KV/D1: static files belong to the deploy version, not to independently
  mutable storage;
- no `nodejs_compat`: no Worker runtime code or Node-dependent Worker library is
  present.

Cloudflare's automatic HTML handling maps `folder/index.html` to `/folder/`, which
matches the site's canonical trailing-slash shape. Its automatic redirect status
is `307`, while the observed GitHub Pages redirect is `301`. The target URL and
rendered result are compatible for site `GET`/`HEAD` navigation, but the status
code is a known hosting-level difference and must be recorded in the migration
smoke test. Do not add a growing hand-maintained redirect table merely to convert
`307` into `301`; that would replace one uniform platform rule with per-directory
special cases. See [HTML handling].

`workers_dev: false` avoids a second permanent public origin. Explicit
`preview_urls: true` still permits `wrangler versions upload --preview-alias
migration` for pre-cutover testing. Cloudflare documents that preview versions do
not become production deployments, and route/domain trigger changes are applied
separately; see [Preview URLs] and [Deployment management]. Preview HTML will
still contain the production canonical URL, which is desirable for parity testing.

## Headers and cache policy

Workers Static Assets supplies MIME types, ETags, `CF-Cache-Status`, and a default
`Cache-Control: public, max-age=0, must-revalidate`. A checked-in
`pages/public/_headers` is copied by Astro and can specialize browser response
headers without request-time code. Cloudflare notes that `_headers` applies to
static assets, supports wildcard/placeholder matching, and is not itself served;
see [Static Assets headers].

Use this policy:

| Path class | Browser cache policy | Rationale |
| --- | --- | --- |
| `/v<exact-semver>/*` | `public, max-age=31536000, immutable` | The repository already enforces append-only exact releases. |
| `/_astro/*` | `public, max-age=31536000, immutable` | Astro filenames are content-fingerprinted. |
| HTML, manifests, `/latest/*`, root aliases, and `/skills/*` | Cloudflare default `max-age=0, must-revalidate` | These are mutable or are navigation documents; ETag revalidation avoids stale content. |
| All public static responses | `Access-Control-Allow-Origin: *` | Preserves existing GitHub Pages behavior and supports public fonts/JSON/CSS/skill consumers. |
| `/skills/moesegfault-style.zip` | Optional `Content-Disposition: attachment; filename="moesegfault-style.zip"` | Makes the archive convenient to save without changing its URL. |

A path rule such as `/v:release/*` can express the exact-release class without one
header rule per release. Validate the deployed match against every existing
version before cutover. Do not put a broad custom `Cache-Control` rule on `/*` and
then another one on exact versions: Cloudflare combines duplicate custom header
values with commas. Let the platform default cover mutable content and override
only the immutable classes.

No cache-purge API belongs in the normal release process:

- a new deployment atomically installs a new complete asset version;
- mutable URLs revalidate against their ETags;
- exact-version URLs never change and therefore never need invalidation.

If an exact release is wrong, publish a new release URL. Purging and overwriting
the old path would violate the existing public contract even if it appeared to
repair a cache.

## Skill packaging and distribution

The skill source is a small capability-oriented package for agents, not a copy of
the entire documentation site. The distribution builder should:

1. read only `skills/moesegfault-style/**`;
2. reject paths outside the source root, symbolic links, duplicate archive entries,
   and non-regular filesystem entries as packaging errors;
3. copy `SKILL.md` byte-for-byte to the public directory;
4. create a deterministic ZIP whose root directory is
   `moesegfault-style/`, so extraction directly into an agent's `skills/`
   directory works;
5. emit `/skills/manifest.json` with a schema version, deterministic
   source-content version, normalized relative filenames, sizes, and SHA-256
   digests;
6. rebuild the same bytes from the same source commit; and
7. run before `astro build`, followed by a test that compares the public copy and
   extracted archive to the source tree.

The manifest is discovery and integrity metadata, not a mutable database. Keeping
it inside `pages/dist` ensures that a Worker rollback changes the skill, archive,
and manifest together rather than producing an inconsistent combination.

## Deployment architecture

### Choice

Retain GitHub Actions because it already owns the project's complete build and
test gate. Cloudflare's native Workers Builds is a sound alternative, but using it
now would either duplicate the existing CI or move unrelated verification during
the same hosting migration. Cloudflare supports both native Builds and external
CI, and documents GitHub Actions deployment with an account ID and API token; see
[Cloudflare CI/CD] and [GitHub Actions].

The production flow should be:

```text
push main
   |
   v
CI: clean checkout -> frozen install -> build release/skill/site
   -> immutable-history check -> unit/E2E tests -> wrangler dry-run
   -> upload pages/dist as ordinary immutable-for-the-run artifact
   |
   v only after successful CI for that exact commit
Deploy workflow: checkout the same SHA -> download that exact artifact
   -> wrangler deploy -> Cloudflare creates and activates one Worker version
```

This separation prevents deployment credentials from being exposed to pull
request jobs and, more importantly, deploys the bytes that passed tests rather
than rebuilding an unverified variant. Pin Node, pnpm, Wrangler, and GitHub Action
revisions. Store `CLOUDFLARE_API_TOKEN` as a GitHub production-environment secret
and `CLOUDFLARE_ACCOUNT_ID` as an environment variable; do not commit either
value. The token should be scoped to the one account/zone and the Worker/domain
operations required by the workflow. Cloudflare's documentation recommends an
account- and zone-scoped token rather than a broadly reusable credential.

`wrangler deploy` creates a new version and immediately deploys it to 100% of
traffic. This is appropriate here because the asset graph is internally coupled:
HTML in one build references hashed JavaScript/CSS in that same build. A gradual
split can serve HTML from one version and a fingerprinted subresource request to
another version, causing a 404 unless version affinity is configured. The small,
fully static site gains little from that machinery; use preview validation and an
atomic 100% deployment instead. See [Versions and deployments] and [Version
affinity].

### Operations and observability

Record the Git SHA, GitHub Actions run, Worker version/deployment ID, deploy time,
and post-deploy smoke result as one release record. The absence of Worker code
means there are intentionally no application `console` logs for successful static
requests; do not enable `run_worker_first` merely to manufacture them. Use
Cloudflare deployment history and platform/zone traffic analytics for service
health, while active probes verify the canonical pages, one exact CSS/JSON/font
resource, the skill archive, and a missing-path 404. Treat `CF-Cache-Status` as a
diagnostic hint rather than an availability invariant because Cloudflare documents
that the header can occasionally report false positives or negatives.

Failure semantics stay simple: a failed CI or upload leaves the active Worker
version unchanged; a missing asset is 404; a successful deploy switches the whole
asset snapshot. Alerting should therefore key on external HTTP probes and failed
deployment workflows, not on the presence of Worker-script logs.

## Migration sequence

### Phase 1: repository preparation (no traffic change)

1. Add the skill source, deterministic packaging, manifest, and focused tests.
2. Add Wrangler as a lockfile-pinned development dependency and commit
   `wrangler.jsonc`.
3. Add `_headers`; preserve the existing generated `/latest/` and `/colors/`
   pages rather than converting their behavior during migration.
4. Replace GitHub Pages deployment with the verified-artifact Workers deployment,
   but keep the existing GitHub Pages site and DNS record active until cutover.
5. Run the complete library, CDN, site, browser, skill, header, and Worker dry-run
   test suite.

### Phase 2: Cloudflare preview (no production route)

1. Inspect the authorized Cloudflare account and `moesegfault.dev` zone; record
   the account/zone identifiers outside public logs and export the current DNS
   record for rollback.
2. Upload the verified artifact as a Worker version with a preview alias instead
   of deploying the Custom Domain trigger.
3. Test all documentation routes, every manifest-listed exact asset, mutable
   aliases, a real 404, both skill downloads, CORS, MIME types, cache headers,
   light/dark themes, and desktop/mobile rendering.
4. Compare exact asset SHA-256 values with the committed release trees and compare
   the extracted ZIP with the source skill.

### Phase 3: hostname cutover

Cloudflare cannot create a Custom Domain on a hostname with an existing CNAME.
The observed GitHub Pages CNAME must therefore be removed before the first
production deploy that attaches `style.moesegfault.dev`.

1. Freeze unrelated deployments for the short cutover window.
2. Confirm the tested commit and artifact identifiers.
3. Remove the existing `style` CNAME from the Cloudflare zone.
4. Deploy the verified Worker configuration with the Custom Domain. Cloudflare
   creates the replacement DNS record and manages the certificate.
5. Run the production P0 smoke matrix immediately, including direct nested-route
   reloads and exact-version/skill checksum verification.
6. Keep the previous GitHub Pages deployment intact for a defined observation
   window; remove the repository `CNAME` file only after the migration is accepted.

This sequence has a small control-plane cutover interval between CNAME deletion
and Custom Domain readiness. If the project later establishes a strict zero-
downtime requirement, a temporary proxied CNAME plus Worker Route can bridge the
transition, but that is not the preferred steady state and adds an external-origin
fallback that this static site does not otherwise need.

## Rollback and destructive boundaries

There are two different rollback operations; do not conflate them.

### Content/deployment rollback

Cloudflare Worker versions include static assets and configuration. `wrangler
rollback <VERSION_ID>` can immediately redeploy one of the most recent versions;
Cloudflare documents a 100-version rollback window. Record the last-known-good
version ID after every production smoke test. See [Rollbacks].

However, a whole-version rollback has an important public-API boundary:

- **Safe:** the bad deployment added no newly published exact-version URL. Roll
  back the Worker version, then repeat P0 smoke tests.
- **Unsafe:** the bad deployment made a new `/v<semver>/...` release public.
  Rolling back to a Worker version that predates it would delete that public URL.
  Build a repair-forward artifact containing the union of all published exact
  releases plus the last-known-good site/mutable aliases, and deploy that instead.

Git history remains the ultimate recovery source after Cloudflare's 100-version
window. Rebuilding an old site revision is valid only after merging in every exact
release that has since become public.

### Domain/provider rollback

Use this only when the Worker platform or Custom Domain attachment itself is the
problem:

1. detach the Worker Custom Domain using the checked-in configuration/control
   plane;
2. restore the previously exported CNAME to `kleedaisuki.github.io`;
3. verify certificate and DNS resolution, then run the same P0 smoke checks;
4. preserve the failed Worker version and evidence for diagnosis.

This fallback is time-bounded: once post-migration content advances and GitHub
Pages is no longer updated, the old Pages deployment becomes stale and is not a
valid routine rollback target.

## Options considered

| Option | Advantages | Material costs | Decision |
| --- | --- | --- | --- |
| Workers Static Assets, no script | One artifact/version, platform MIME/ETag/cache, free static requests, simple 404 semantics. | 25 MiB/file and plan file-count limits; directory redirects are 307 instead of GitHub's 301. | **Selected.** |
| Static Assets plus Worker script | Arbitrary redirects/headers and request logic. | Every selected request can invoke code; headers must be duplicated in code; more tests/failure modes. | Reject until a real dynamic requirement exists. |
| R2 behind a Worker | Suitable for independently updated, very large object sets. | Separate mutable state is outside Worker rollback, plus upload/index/cache logic; current artifact is only about 7 MB. | Reject. Revisit only for files over 25 MiB or materially larger independent archives. |
| Cloudflare Pages | Familiar static hosting and Git integration. | User explicitly requested Workers; Cloudflare directs new development toward Workers Static Assets. | Reject. |
| Worker Route over GitHub Pages CNAME | Easy origin fallback and potentially smaller first cutover. | Keeps GitHub as an unnecessary origin and models the Worker as middleware rather than the origin. | Optional temporary bridge only; not steady state. |
| Native Workers Builds | First-party previews and fewer GitHub secrets. | Splits or duplicates the established CI gate during migration. | Defer; GitHub Actions is already the tested control plane. |
| Gradual deployment | Percentage rollout. | Cross-version hashed-asset mismatch unless version affinity is added; little value for a small static site. | Reject for normal releases. |

## Verification gates

The detailed executable matrix lives in `docs/migration-validation-plan.md`. The
architecture is accepted only when all of these hold:

- `pages/dist` is built from a clean checkout and is the exact artifact deployed;
- unit/type/CDN tests, browser E2E, lint, format, skill packaging tests, and
  `wrangler deploy --dry-run` pass;
- all ten documentation routes work under the Worker runtime in desktop/mobile
  and light/dark cases without unexplained screenshot or behavioral changes;
- every exact-version file matches its committed SHA-256 value;
- mutable aliases still resolve to the declared stable version;
- `/skills/moesegfault-style/SKILL.md`, `/skills/moesegfault-style.zip`, and
  `/skills/manifest.json` agree with the source skill and are cross-origin
  fetchable;
- exact-version and `/_astro` resources have immutable caching, mutable content
  revalidates, and missing resources return 404;
- production DNS, Worker version ID, Git commit, workflow run, and smoke results
  are recorded.

## Risks and watchpoints

| Risk | Consequence | Control / revision trigger |
| --- | --- | --- |
| A build omits committed releases or the skill. | Public URL disappears. | Inventory tests and deploy only the verified `pages/dist`. |
| A broad immutable cache rule catches `/latest` or `/skills`. | Consumers retain stale mutable content for a year. | Narrow placeholder rule plus deployed-header tests. |
| The ZIP is nondeterministic or differs from source. | Manifest verification and reproducibility fail. | Normalize paths/order/timestamps and test two builds. |
| A dashboard edit drifts from `wrangler.jsonc`. | The next CI deploy silently reverses it. | Treat Wrangler configuration as source of truth; document emergency changes and immediately reconcile them. |
| Static tree grows past a platform limit. | Deployment fails. | CI file-count/max-size check; reconsider R2 only when measured growth requires it. |
| Rollback removes a newly published exact release. | Existing consumers break. | Apply the safe/unsafe rollback boundary above; repair forward with the release union. |
| Preview and production differ because of zone-level features. | Preview passes but custom domain fails. | Production smoke test remains mandatory; use a version override later only if zone-level behavior becomes material. |

## Implementation slices and integration order

1. **Skill source** — `skills/moesegfault-style/**`.
2. **Skill packager** — deterministic copy/ZIP/manifest and unit tests.
3. **Public artifact composition** — invoke packaging before Astro build; assert
   final inventory.
4. **Static response policy** — `_headers` and focused Worker routing/header tests.
5. **Worker configuration** — root `wrangler.jsonc`, lockfile-pinned Wrangler,
   local `wrangler dev`, and dry run.
6. **CI** — verified artifact upload and credential-free PR gates.
7. **Deployment** — same-SHA artifact download and production-environment
   `wrangler deploy`.
8. **Preview and cutover** — Cloudflare version preview, DNS replacement, and P0
   production validation.
9. **Cleanup** — remove GitHub Pages-specific `CNAME`/documentation only after the
   observation window.

Each slice has a single primary owner and a narrow write region. The hosting slice
must not refactor style components; the skill slice must not alter existing
library release semantics.

## References

All platform behavior below was checked against Cloudflare's current official
documentation on 2026-09-20:

- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Static Assets configuration and bindings](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Static Assets redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)
- [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Static Assets billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Workers platform limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare CI/CD](https://developers.cloudflare.com/workers/ci-cd/)
- [GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Versions and deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/)
- [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
- [Version affinity](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/)
- [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

[Workers best practices]: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
[Static Assets]: https://developers.cloudflare.com/workers/static-assets/
[Custom Domains]: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
[Workers platform limits]: https://developers.cloudflare.com/workers/platform/limits/
[Static Assets billing and limitations]: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
[HTML handling]: https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
[Preview URLs]: https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/
[Deployment management]: https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/
[Static Assets headers]: https://developers.cloudflare.com/workers/static-assets/headers/
[Cloudflare CI/CD]: https://developers.cloudflare.com/workers/ci-cd/
[GitHub Actions]: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
[Versions and deployments]: https://developers.cloudflare.com/workers/versions-and-deployments/
[Version affinity]: https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/
[Rollbacks]: https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
