# Capability Map

Use this map to select a public primitive before reading the installed declarations for exact props.

## Foundations

| Need | Public capability | Selection guidance |
| --- | --- | --- |
| Page width and gutters | `Container` | Choose narrow for reading and wider only when content needs it. React uses `size`; Astro uses `maxWidth`/`gutter`, so check the framework-specific declaration. |
| Vertical rhythm | `Stack` | Prefer a shared gap scale over per-child margins. |
| Wrapping horizontal groups | `Cluster` | Suitable for actions, metadata, and tool groups. |
| Responsive columns | `Grid` | Set the minimum column width; `ruled` draws shared hairlines instead of gaps. |
| Product identity and glyphs | `BrandMark`, `Icon` | Supply accessible text for meaningful icons; leave decorative icons unnamed. |
| Content grouping | `Card`, `Panel` | Cards group content; a panel adds a title bar for tools and data. `interactive` cards need a real link or button in the title. |
| Actions | `Button`, `IconButton`, `ButtonGroup` | Preserve button-versus-link semantics. One `primary` per view; use `secondary` and `ghost` for the rest. Icon-only controls require a label. |
| Status and feedback | `Badge`, `Notice`, `StatusDot` | Do not encode state by color alone. Notices already provide live-region defaults. |

## Controls and data

These are React components. Static pages can use the same documented classes on native elements.

| Need | Public capability | Selection guidance |
| --- | --- | --- |
| Labelled form controls | `Field` with `Input`, `Textarea`, `Select` | `Field` wires label, hint, error, and required state. The app owns validation. |
| Choices | `Checkbox`, `Radio`, `Switch`, `SegmentedControl` | Use a switch for settings that apply immediately and a checkbox for values submitted with a form. |
| In-page navigation | `Tabs`, `Accordion`, `Breadcrumbs` | Tabs swap peer views. Do not hide content that readers need to compare. |
| Overlays | `Dialog`, `Tooltip` | Dialog is a controlled native element. A tooltip describes a control that already has a name. |
| Tabular data | `Table`, `DescriptionList`, `Stat` | Mark numeric cells with `data-numeric`. Give every table a label. |
| Progress and loading | `Progress`, `Spinner`, `Skeleton`, `Button loading` | Progress for known extent, spinner for unknown, skeleton for known layout. |
| Nothing to show | `EmptyState` | Say what will appear and offer the action that creates it. |
| Small details | `Avatar`, `Kbd`, `Separator` | Presentational only. |

## Rich and interactive surfaces

| Need | Public capability | Boundary |
| --- | --- | --- |
| Translucent surfaces | `GlassPanel`, `GlassCard`, `GlassToolbar` | Place over real background content. Glass is not a privacy boundary and may need a stronger tint for text contrast. |
| Entrance emphasis | `Motion` | One-shot presentation only; never use animation as the sole representation of business state. |
| Code presentation | `CodeBlock` | Prefer an explicit language. Unknown or oversized input falls back to escaped plain text. |
| Conversations | `MessageBubble` family, `Composer` | The app owns message state, transport, persistence, retries, and moderation. |
| Rendered prose and formulas | `Markdown`, `Math` | The app still owns external-content policy. Use the dedicated rich-text entrypoint. |
| Markdown authoring | `RichTextEditor` | The app owns the Markdown value and saving. Visual edits may normalize supported Markdown; source mode preserves unsupported constructs. |

Astro's native component set is intentionally smaller than React's. Check the installed package exports before assuming parity. For a static-only effect, semantic HTML plus documented CSS may be better than introducing a React island.

## Visual grammar

Aim for cute by default and careful by design: the Klee palette on a hairline grid, with the density of a good developer tool.

- Snow surfaces, leather text, and crimson action establish the base relationship. Honey highlights, clover confirms, berry warns of danger. Never invent new hues.
- Use `data-moe-surface="brand"` for at most one or two crimson regions per page. Components inside adapt; keep status colors out.
- Do not use the deprecated `cream`, `brown`, `coral`, `gold`, `green`, `red`, `gray`, or `ink` primitives in new work.
- Hairlines carry structure. Use `--moe-line` inside a surface and `--moe-line-strong` around controls.
- Radii are tight (3, 6, 8, 12). Pills are for switches and dots, not for buttons or cards.
- The sans face suits headings and controls; the mono face suits paths, identifiers, versions, and numbers.
- Reading width and alignment take priority over filling the viewport.
- Avoid nesting surfaces until hierarchy becomes ambiguous; a ruled grid often replaces several cards.
- Move geometry with `transition: … var(--moe-spring)` (settle), `var(--moe-bounce)` (small pops), or `var(--moe-exit)` (leaving). These pairs become `0s` under reduced motion, so do not add separate media queries. Keep things still at rest and animate only what the user touched or what just appeared.
- Shadows, glass, gradients, and entrance motion mark focal moments rather than decorate every block.
- Dark mode should preserve semantic relationships, not reproduce light-mode literals mechanically.

Start from the library's defaults. Override a semantic token only when the host product needs a coherent system-level change; use a local class when the change belongs to one feature.

## Completion checks

- The chosen controls retain correct button, link, heading, form, and live-region semantics.
- Focus remains visible, and keyboard interaction follows the native element contract.
- Content remains readable at narrow widths and with long localized text.
- Both themes keep sufficient distinction among background, surface, text, border, and action roles.
- Reduced-motion and reduced-transparency fallbacks remain effective.
- No application code imports private package paths or copies generated library CSS.
