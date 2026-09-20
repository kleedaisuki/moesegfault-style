# Capability Map

Use this map to select a public primitive before reading the installed declarations for exact props.

## Foundations

| Need | Public capability | Selection guidance |
| --- | --- | --- |
| Page width and gutters | `Container` | Choose narrow for reading and wider only when content needs it. React uses `size`; Astro uses `maxWidth`/`gutter`, so check the framework-specific declaration. |
| Vertical rhythm | `Stack` | Prefer a shared gap scale over per-child margins. |
| Wrapping horizontal groups | `Cluster` | Suitable for actions, metadata, and tool groups. |
| Product identity | `BrandMark`, `Icon` | Supply accessible text for meaningful icons; leave decorative icons unnamed. |
| Content grouping | `Card` and its React subcomponents | Use semantic headings inside the card; a card does not imply a click target. |
| Actions and navigation | `Button` | Preserve button-versus-link semantics. Choose variants by hierarchy, not decoration. |
| Status and feedback | `Badge`, `Notice`, `StatusDot` | Do not encode state by color alone. Notices already provide live-region defaults. |

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

Aim for a warm editorial workshop rather than a generic rounded dashboard:

- Paper-like cream surfaces, ink-like text, and coral emphasis establish the base relationship.
- Display faces suit headings; a legible system sans stack suits body text and controls.
- Reading width and vertical rhythm take priority over filling the viewport.
- Cards organize meaningful groups; avoid nesting surfaces until hierarchy becomes ambiguous.
- Strong shadows, glass, gradients, icons, and entrance motion should mark focal moments rather than decorate every block.
- Dark mode should preserve semantic relationships, not reproduce light-mode literals mechanically.

Start from the library's defaults. Override a semantic token only when the host product needs a coherent system-level change; use a local class when the change belongs to one feature.

## Completion checks

- The chosen controls retain correct button, link, heading, form, and live-region semantics.
- Focus remains visible, and keyboard interaction follows the native element contract.
- Content remains readable at narrow widths and with long localized text.
- Both themes keep sufficient distinction among background, surface, text, border, and action roles.
- Reduced-motion and reduced-transparency fallbacks remain effective.
- No application code imports private package paths or copies generated library CSS.
