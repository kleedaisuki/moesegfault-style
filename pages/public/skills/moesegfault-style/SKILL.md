---
name: moesegfault-style
description: Build or restyle web interfaces with the MoeSegfault Style design system, including its CSS and tokens, React components, Astro components, themes, and versioned static assets. Use when a user asks to adopt, extend, or match MoeSegfault Style; do not use for unrelated generic UI work.
---

# MoeSegfault Style

Use the public contracts of `@moesegfault/style` to produce warm, editorial interfaces without recreating the library in application code.

## Start from the host application

Inspect the framework, package manager, existing style entrypoint, theme behavior, and component conventions before editing. Preserve the application's behavior and choose the smallest useful adoption layer:

- Use tokens and CSS for framework-independent styling or gradual adoption.
- Use native Astro components for static Astro pages.
- Use React components for React applications or genuinely interactive Astro islands.
- Use versioned remote assets for static HTML without a build pipeline.

Read [references/integration.md](references/integration.md) when installing the package, selecting an entrypoint, configuring themes, or consuming remote assets. Read [references/capabilities.md](references/capabilities.md) when choosing components or matching the visual language.

## Compose instead of cloning

Prefer public layout and UI primitives over copying their markup or CSS. Add application-specific structure around them and use semantic `--moe-*` tokens for custom styles. Do not import package internals, `dist` paths, source files, or undocumented selectors.

Keep the visual hierarchy restrained:

- Treat content as the focus and paper-like surfaces as its frame.
- Use the coral/berry accent for actions and emphasis, not every element.
- Prefer readable line lengths, generous rhythm, and semantic surface/text tokens.
- Use glass, sparkle, and motion as occasional emphasis. They should not become the page's baseline texture.

Preserve native semantics and the host framework's event, form, and routing conventions. The library supplies visual and interaction primitives, not application state, persistence, authorization, networking, or content policy.

## Customize at the public boundary

Use component props first, then semantic tokens, then small host-owned classes. Avoid hard-coded copies of the palette because they bypass light/dark themes. Keep host overrides outside the library's cascade layers so ordinary application CSS can override the layered defaults without `!important`.

Load global CSS once at an application entry or layout. Add specialized entrypoints only when the feature is used; ordinary controls should not pull in the editor, Markdown renderer, or highlighter through an unrelated import.

## Verify the result

Run the host project's normal type, test, lint, and build checks. Also inspect representative pages at narrow and wide widths, in light and dark themes, with keyboard navigation, and with reduced-motion preferences when motion is present. Verify that package and static-asset imports resolve from documented exports.

When exact props, exports, selectors, or release paths matter, treat the installed type declarations and [style.moesegfault.dev](https://style.moesegfault.dev) as authoritative. Do not guess an API from its visual appearance.
