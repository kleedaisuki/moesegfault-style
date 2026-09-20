# Integration Guide

Use this reference only when selecting or implementing an integration path.

## Choose a distribution path

| Host | Preferred path | Notes |
| --- | --- | --- |
| React 19+ | npm package plus `@moesegfault/style/react` | Install `react` and `react-dom` explicitly. |
| Astro | npm package plus native `.astro` exports | Native components render static HTML by default. Use React islands only for interaction that needs them. |
| Other bundled web apps | CSS/tokens from the npm package | Build framework-native markup around public CSS and semantic tokens. |
| Static HTML | Exact-version assets from `style.moesegfault.dev` | Resolve the current version through the manifest and pin it for production. |

The package is ESM-only. CSS imports are deliberately explicit; importing JavaScript does not silently install global styles.

## Package setup

Install the package with the host project's package manager. Import the complete stylesheet once for normal adoption:

```ts
import "@moesegfault/style/all.css";
```

For deliberately selective adoption, preserve this order:

```css
@import "@moesegfault/style/tokens.css";
@import "@moesegfault/style/foundation.css";
@import "@moesegfault/style/components.css";
```

Specialized CSS such as glass, motion, messages, code, Markdown/math, or editor styles belongs after its prerequisites. Prefer `all.css` unless bundle evidence justifies managing layers manually.

### React

```tsx
import "@moesegfault/style/all.css";
import { Button, Card, Container, Stack } from "@moesegfault/style/react";

export function Welcome() {
  return (
    <Container size="narrow">
      <Stack gap="lg">
        <Card>
          <h1>Build on a warm sheet of paper.</h1>
          <Button>Continue</Button>
        </Card>
      </Stack>
    </Container>
  );
}
```

Components extend corresponding native HTML props where practical. Preserve native form and link behavior instead of wrapping controls with competing interaction handlers.

### Astro

```astro
---
import "@moesegfault/style/all.css";
import { Button, Card, Container, Stack } from "@moesegfault/style/astro";
---

<Container>
  <Stack>
    <Card><h1>Static first.</h1></Card>
    <Button href="/start">Continue</Button>
  </Stack>
</Container>
```

Explicit exports such as `@moesegfault/style/astro/Button.astro` are also public. Do not add hydration to native Astro components. If an advanced capability exists only as a React component, isolate it with an appropriate Astro client directive rather than hydrating the whole page.

## Themes and custom styles

Set `data-moe-theme="light"`, `"dark"`, or `"auto"` on the document root. With no explicit value, the foundations follow the system preference. In bundled applications, use `applyTheme`, `resolveTheme`, and `createThemeBootstrap` from the package root; place the generated bootstrap early enough to avoid a first-paint theme flash.

In an Astro layout, the bootstrap can remain static and run before hydrated controls:

```astro
---
import { createThemeBootstrap } from "@moesegfault/style";
---
<script is:inline set:html={createThemeBootstrap()} />
```

A later theme control may persist the same `moe-theme` key and call `applyTheme`; it does not require hydrating the native Astro style components.

For host-owned CSS, prefer semantic variables such as `--moe-background`, `--moe-surface`, `--moe-text`, `--moe-text-soft`, `--moe-heading`, `--moe-accent`, `--moe-border`, and the public spacing, radius, shadow, typography, and motion scales. Raw palette tokens are appropriate only when a semantic role truly does not fit.

## Static assets

Start with the root manifest rather than assuming the latest release number:

```text
https://style.moesegfault.dev/manifest.json
https://style.moesegfault.dev/v<exact-semver>/manifest.json
https://style.moesegfault.dev/v<exact-semver>/css/all.css
```

Use `/v<exact-semver>/...` for reproducible production builds. `/latest/...` and unversioned convenience paths intentionally move and suit prototypes or consumers that accept automatic updates. Remote distribution focuses on CSS, token data, fonts used by bundled features, and static icons; React and Astro components belong in the package-manager path.

Keep adjacent assets with feature CSS when self-hosting, especially KaTeX font assets. Preserve applicable package and third-party license notices when redistributing files.

## Advanced entrypoints

Import advanced features only from their documented entrypoints:

- Framework-independent code highlighting: `@moesegfault/style/code`
- Framework-independent Markdown and math rendering: `@moesegfault/style/markdown`
- React Markdown and math: `@moesegfault/style/react/rich-text`
- React rich-text editor: `@moesegfault/style/react/editor`
- Token data: `@moesegfault/style/tokens.json` or `tokens.dtcg.json`

These boundaries keep parser, highlighter, editor, and React dependencies away from consumers that do not need them. Respect the input limits and fallback behavior documented by the installed release; the renderers do not replace an application's URL, image, upload, or authorization policy.
