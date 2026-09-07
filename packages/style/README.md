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

### Frosted glass / 真正的毛玻璃

```tsx
<GlassPanel tone="warm" blur={12} tintOpacity={0.42}>
  <p>背景仍有轮廓，眼前的文字保持清晰。</p>
</GlassPanel>
```

Place the panel **over** real content: `backdrop-filter` blurs pixels behind it, not its children.
The default 42% tint fades toward 30%; `blur` accepts 0–40 px and `tintOpacity` 0–1.
CSS-only equivalents are `--moe-glass-blur: 12px` and `--moe-glass-opacity: 42%`.

必须让面板与真实文字/画布叠放；只有空白背景时不会凭空出现玻璃效果。模糊不会隐藏私密信息，
也不保证任意复杂背景上的文字对比度。密集正文可提高染色不透明度或改用普通 `Card`。
避免祖先元素的 `opacity`、`filter` 意外改变背景采样边界；不支持模糊或要求减少透明度时回退实色。

### Markdown + TeX / 文稿与公式

```tsx
import "@moesegfault/style/all.css";
import { Markdown, Math as Formula } from "@moesegfault/style/react/rich-text";

<Markdown content={String.raw`**一页随记**，也放得下一行公式 $E=mc^2$。`} />;
<Formula tex={String.raw`\int_0^1 x^2\,dx = \frac{1}{3}`} display />;
```

Astro: import `Markdown.astro` / `Math.astro` from `@moesegfault/style/astro/`.
Framework-independent: `renderMarkdown(content)` / `renderMath(tex, display)` from
`@moesegfault/style/markdown`. The dedicated React rich-text entry keeps ordinary controls free of
parser dependencies. Astro renders at build/server time with no client parser or math runtime.

支持 GFM 表格、任务列表、删除线、代码围栏，以及 `$…$` 行内公式和 `$$…$$` 独立公式。
Markdown 不接受原始 HTML；URL 先清洗再交给可信高亮/公式渲染器。KaTeX 禁用可信扩展并限制宏展开，
无任意渲染器选项。公式输出 HTML + MathML，长块级公式支持键盘滚动。

Budgets: 50,000 UTF-16 units per Markdown document, 4,096 per formula, 128 formulas and 64 brace
levels; excess or failed input falls back to escaped text. These are practical synchronous safeguards,
not a hard execution-time guarantee. For hostile bulk input, use an application-level worker/time budget.
Safe rendering does not make external links or images trustworthy; applications still own their content policy.

`all.css` / `components.css` include the new styles. For explicit layering, use `markdown.css` and
`math.css` after the existing foundations/components. KaTeX fonts and its MIT notice are bundled under
`dist/assets/katex/` and mirrored to exact-version, latest and default CDN assets—no external font service.
公式字体随包自托管；不要单独搬走 CSS 而遗漏相邻的 `assets` 目录。

### Rich-text editor / 富文本编辑器

```tsx
import { useState } from "react";
import { RichTextEditor } from "@moesegfault/style/react/editor";
import "@moesegfault/style/all.css";

/** 应用持有 Markdown，保存逻辑由应用实现。The app owns Markdown and implements persistence. */
export function Draft() {
  const [markdown, setMarkdown] = useState("## 趁想法还温热\n\n写下一句话。");
  return <RichTextEditor value={markdown} onChange={setMarkdown} name="body" label="随记" />;
}
```

`RichTextEditor` offers visual, source and preview views. `value` / `onChange(markdown)` exchange
Markdown strings; `defaultValue` supports uncontrolled usage. `readOnly`, `disabled`, `name`,
`label`, `locale="zh|en"`, and `defaultMode="visual|source|preview"` configure the integration.
`name` contributes a hidden Markdown form field; disabled editors do not submit it.

支持标题、粗斜体、删除线、列表、任务列表、引用、链接、代码与普通表格，包含撤销/重做。
表格单元格限定单段单行，使用 Tab 移动，多行粘贴合并为空格。TeX、图片、HTML、脚注、
对齐表格等超出可视子集的内容保留在源码视图，仍可安全预览。富 HTML 粘贴降为纯文本。

Initialization and mode switches preserve source bytes. Actual visual edits normalize Markdown markers
and whitespace: this is a semantic format, not an arbitrary lossless HTML/document-layout format.
The upstream Tiptap Markdown extension is beta; applications should test their own document corpus.
源码保全优先于强制转换；不承诺任意 Markdown 的无损可视往返。

Visual mounting is limited to 50,000 UTF-16 units, 64 AST levels and 5,000 nodes; larger documents remain
editable as source. These are responsiveness safeguards, not a strict execution-time guarantee.

Astro can use the React component with `client:visible` or `client:load`. The editor is client-initialized
and ships a safe read-only SSR fallback. Use `all.css`, or add `editor.css` after the existing content
styles. The dedicated entry prevents ordinary components and read-only renderers from loading Tiptap.

编辑器不自动保存、不上传、不提供协同冲突处理。输入法组合事件有回归测试，但真实 Windows、
Android、iOS 输入法仍应结合目标设备验收。Read-only/disabled states do not replace server authorization.
