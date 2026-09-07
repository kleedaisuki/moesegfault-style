# @moesegfault/style

MoeSegfault 的暖纸编辑工坊设计系统：设计令牌（Design Tokens）、CSS、React 19 组件与原生
Astro 组件。

```bash
pnpm add @moesegfault/style
```

```tsx
import "@moesegfault/style/all.css";
import { Button, Card } from "@moesegfault/style/react";
```

完整文档、组件状态与 Astro/CDN 接入方式见
[style.moesegfault.dev](https://style.moesegfault.dev)。包采用 GPL-3.0-or-later 许可。

## v0.1.2 · Glass, motion, code, conversations / 玻璃、动效、代码与消息

```tsx
import "@moesegfault/style/all.css";
import {
  CodeBlock, GlassCard, Icon, MessageBubble, MessageQuote, Motion,
} from "@moesegfault/style/react";

<Motion preset="rise">
  <GlassCard tone="warm">
    <Icon name="brand" size={48} title="MoeSegfault" />
    <MessageBubble author="Moe" tone="soft" status="Ready">
      <MessageQuote author="Klee">Keep the warm paper.</MessageQuote>
      <p>A translucent surface, the same warm identity.</p>
    </MessageBubble>
    <CodeBlock code="const answer = 42;" language="typescript" filename="answer.ts" />
  </GlassCard>
</Motion>;
```

| API | Contract / 约定 |
| --- | --- |
| `GlassPanel`, `GlassCard`, `GlassToolbar` | `tone="neutral\|warm\|rose"`; opaque fallback, reduced transparency and forced colors / 实色回退、减少透明度与强制颜色支持。 |
| `Motion` | `preset="fade\|rise\|scale\|slide"`, `delay`, `duration` (0–2000 ms), `disabled`; one-shot on mount, respects reduced motion / 挂载时单次播放，尊重系统减少动态偏好。 |
| `Icon` | `name="brand\|sparkle"`, `size`, `title`; unnamed icons are decorative / 未命名图标默认为装饰。 |
| `CodeBlock` | `code`, `language`, `filename`, `label`, `copyable`, `wrap`; localizable `copyLabel`, `copiedLabel`, `copyErrorLabel` / 可本地化复制反馈。 |
| `MessageBubble` | Existing props preserved; adds `avatar`, `actions`, `status`, `tone="solid\|soft\|outline"` / 保留旧属性，新增插槽与表面风格。 |
| Message family / 消息家族 | `MessageTyping`, `MessageQuote`, `MessageAttachment`, `MessageActions`, `MessageAction`; native semantics, no backend implied / 原生语义，不包含后端业务。 |

### Code and fonts / 代码与字体

Astro: `import CodeBlock from "@moesegfault/style/astro/CodeBlock.astro"`.
Framework-independent highlighting: `import { highlightCode } from "@moesegfault/style/code"`.
TypeScript/JavaScript (including TSX/JSX), CSS, JSON, shell, and HTML/XML are explicitly registered;
Astro uses markup highlighting. Unknown languages and inputs over 50,000 UTF-16 code units render as
escaped plain text; no automatic language guessing. Root token/theme imports do not load the highlighter.

显式支持上述语言；Astro 采用标记语言高亮，不宣称完整编译器级解析。未知语言与超过 50,000 个
UTF-16 代码单元的输入安全回退纯文本；根令牌入口不加载高亮器。复制需要安全上下文与浏览器支持，失败会明确提示。

The font stack prefers JetBrains Mono; the library does not download fonts. To self-host like the docs:

```tsx
import "@fontsource-variable/jetbrains-mono";
```

先安装 `@fontsource-variable/jetbrains-mono`，由应用自行托管；也可设置 `--moe-code-font-family`。
The docs bundle the OFL-1.1 font locally. Highlight.js is BSD-3-Clause; see `THIRD_PARTY_NOTICES.txt`.

### CSS and static SVG / 样式与静态图标

`all.css` and `components.css` include the new families. Standalone `glass.css`, `motion.css`,
`messages.css`, `code.css`, and `icons.css` are also exported; load theme tokens and foundations first.
The `messages.css` enhancement expects the existing `components.css` base.

旧的分层导入继续有效，无需迁移。CSS 动效也可直接使用 `.moe-motion[data-motion="rise"]`、
`.moe-hover-lift`、`.moe-press`。请勿用动画控制业务状态。

Static assets: `@moesegfault/style/icons/brand.svg` and `@moesegfault/style/icons/sparkle.svg`;
CDN: `/v0.1.2/assets/icons/brand.svg`. Use meaningful `alt` text on `<img>` or `alt=""` for decoration.
祖传品牌路径原样保留；已有 `BrandMark` API 不变。
