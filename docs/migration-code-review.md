# Static distribution and Workers migration code review

Date: 2026-09-20. Scope: the migration working-tree changes, agent skill,
download builder, static headers/configuration, CI/deployment, and documentation.
This was a correctness/compatibility review, not a security audit. Production
files were not edited by the reviewer. Runtime and browser validation remain
separate gates documented in the migration validation plan.

## Result

One P1 deployment failure was found and corrected during review. No remaining
concrete P0-P2 defect was identified in the reviewed change after that correction.

### Resolved P1: deployment tooling must exist in the deployment job

The initial `.github/workflows/deploy.yml` went directly from checkout/artifact
download to `cloudflare/wrangler-action`, without provisioning pnpm or project
dependencies. Jobs do not inherit the verification job's installed tooling.

Inspection of the exact pinned Wrangler action commit
`ebbaa1584979971c8614a24965b4405ff95890e0` established this executable path:

1. `detectPackageManager()` sees `pnpm-lock.yaml` and chooses pnpm.
2. `resolveInstalledVersion()` tries `pnpm exec wrangler --version`.
3. When Wrangler is missing, `installWrangler()` invokes `pnpm add wrangler@4.135.0`.
4. This either cannot find pnpm, or, even with pnpm provisioned, attempts to add
   a root workspace dependency without `-w` and hits the workspace-root check.

The corrected workflow now provisions pnpm and Node 24, then runs
`pnpm install --frozen-lockfile` before downloading/deploying the verified artifact.
The action finds the already installed exact Wrangler version and skips its
installation branch. Thus the frozen install is intentional, not a redundant
second installation. A direct `pnpm exec wrangler deploy` would also be valid,
but replacing the action is not necessary to resolve this defect.

## Four-layer inspection

| Layer | Inspected contracts | Conclusion |
| --- | --- | --- |
| Data structures | Skill source tree, manifest file/archive digests, ZIP local/central records, stable ordering and timestamps | Internally coherent for the actual small text-only skill. No need for ZIP64 or a separate distribution datastore. |
| Special cases | Source entrypoint discovery, nested references, stage cleanup/replacement, absent static resources, mutable aliases versus exact releases | No concrete new failure path identified. The no-script static configuration avoids SPA fallback for missing assets. |
| Complexity | One Astro artifact, native static serving, progressive-disclosure skill, reuse of directory replacement | No materially superior redesign justified for this migration. |
| Compatibility | Existing versioned trees, CSS/theme API examples, same-run artifact transfer, unchanged showcase components, cache/CORS rules | Existing URL/content contracts are retained; deployment setup defect was corrected. |

## Evidence and boundaries

- Reviewed `scripts/build-skill-downloads.mjs`, its tests, root build scripts,
  `skills/moesegfault-style/**`, `_headers`, Wrangler JSONC, both workflows,
  distribution-page additions, and migration/readme guidance.
- Cross-checked skill examples against React layout props and theme helpers.
- Inspected the pinned action's [metadata](https://github.com/cloudflare/wrangler-action/blob/ebbaa1584979971c8614a24965b4405ff95890e0/action.yml)
  and [compiled implementation](https://github.com/cloudflare/wrangler-action/blob/ebbaa1584979971c8614a24965b4405ff95890e0/dist/index.mjs).
- Consulted current [Cloudflare static-header documentation](https://developers.cloudflare.com/workers/static-assets/headers/)
  and [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
- This review does not claim a successful hosted GitHub deployment, production
  DNS cutover, or visual parity measurement; those require the independent
  execution evidence maintained by the migration/validation owners.
