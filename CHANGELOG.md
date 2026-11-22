# Changelog / 更新记录

## 0.2.0 — 2026-11-22

A full visual reset in the Klee palette: crimson, honey, clover and leather. Color, shape, type, elevation, density and
the component set are all new. See [docs/v0.2.0-design.md](./docs/v0.2.0-design.md).
Klee 色系的完整视觉重置：绯红、蜜金、四叶草与皮革棕；颜色、形状、字体、层级、密度与组件集全部重做。

### Added / 新增

- Added the `moesegfault-style` Agent Skill with deterministic ZIP, manifest, and checksum downloads.
  新增 `moesegfault-style` Agent Skill，并提供可复现 ZIP、清单与校验和下载。

- React controls: `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `SegmentedControl`.
  React 表单控件，`Field` 自动关联标签、说明与错误。
- React navigation and overlays: `Tabs`, `Breadcrumbs`, `Accordion`, `Dialog`, `Tooltip`.
  React 导航与浮层；对话框与折叠项使用原生 `dialog` 和 `details`。
- React data display: `Table`, `Stat`, `DescriptionList`, `Kbd`, `Avatar`, `Separator`, `Progress`, `Spinner`,
  `Skeleton`, `EmptyState`.
  React 数据展示组件。
- `Panel`, `Grid`, `CardFooter`, `IconButton`, `ButtonGroup`; `Button` gains `contrast`, `loading` and `iconOnly`,
  `Card` gains `interactive`, `Badge` and `Notice` gain `warning`.
  新增面板、网格与按钮组合，以及按钮、卡片、徽章和通知的新变体。
- Astro: `Badge`, `Grid`, `Icon`, `Notice`, `Panel`.
  新增五个原生 Astro 组件。
- Klee palette primitives and the `highlight`, `on-highlight`, `brand`, `on-brand` roles, plus
  `data-moe-surface="brand"`, which remaps roles inside a crimson region.
  Klee 色板、高光与品牌角色，以及会重映射内部角色的品牌表面。
- 41 first-party interface icons through `Icon`, plus the `iconGlyphs` geometry export.
  自绘界面图标与 `iconGlyphs` 几何导出。
- Motion system: `spring` and `bounce` tokens sampled from damped springs, the `--moe-spring`, `--moe-bounce` and
  `--moe-exit` pairs that reduced motion zeroes, and `.moe-draw` for icons that redraw on hover.
  动效系统：由阻尼弹簧采样的令牌、在减少动态时归零的成对变量，以及悬停重绘图标的 `.moe-draw`。
- Opt-in `fonts.css` with self-hosted Geist and Geist Mono (OFL-1.1); `all.css` still downloads no text fonts.
  可选 `fonts.css` 自托管 Geist 与 Geist Mono；`all.css` 仍不下载文本字体。
- `forms.css`, `data.css`, `navigation.css`, `overlay.css` entrypoints, and semantic tokens `line`, `line-strong`,
  `action`, `on-action`, `warning`, `surface-sunken`, `overlay`.
  新样式入口与语义令牌。

### Changed / 变更

- Semantic colors, code colors and the brand mark follow the Klee palette. Danger moved to berry and its button is
  outlined, because a filled red danger button would read as the primary action.
  语义色、代码色与品牌标记改用 Klee 色系；危险改为莓色描边，避免与主按钮混淆。
- Radii, shadows, motion durations, control heights and font stacks have new defaults. Pin `/v0.1.2/` or override the
  matching `--moe-*` variables to keep the old look.
  圆角、阴影、动效时长、控件高度与字体栈更换默认值；可锁定 `/v0.1.2/` 或覆盖对应变量保留旧外观。
- `CodeBlock` hides its language label when a `filename` is given, and `RichTextEditor` drops its permanent help footer.
  有文件名时代码框不再重复语言标签；编辑器去掉常驻说明。
- Controls respond physically: buttons press, checks and switches spring, tabs and segments share one sliding indicator,
  accordions and dialogs animate both ways, and interactive cards grow corner ticks.
  控件有了触感：按压、弹性勾选、滑动指示、双向展开与卡片角标。
- The brand name is written moeSegFault; `BrandMark` uses it by default.
  品牌名统一为 moeSegFault，`BrandMark` 默认使用它。
- The documentation site is rebuilt from public components in both locales, with a chargeable pixel blast, dithered
  edges, page transitions, and a clover-shaped theme reveal.
  双语文档站全部改用公开组件重建。
- Migrated the documentation and static distribution origin from GitHub Pages to Cloudflare Workers Static Assets,
  preserving the canonical host and public URL contracts. CI now gates deployment on browser/visual tests and a
  Wrangler dry-run.
  文档与静态分发源站从 GitHub Pages 迁移到 Cloudflare Workers Static Assets，规范域名与公开 URL
  契约保持不变；CI 新增浏览器/视觉回归与 Wrangler dry-run 部署门禁。

### Fixed / 修复

- Markdown formulas and standalone formulas now share one KaTeX renderer, pinned to the exact version that
  `math.css` ships. They previously emitted 0.16 markup against 0.18 styles.
  Markdown 公式与独立公式共用一个 KaTeX 渲染器，并锁定为 `math.css` 随附的版本；此前标记与样式版本不一致。
- Long display formulas scroll inside their own box in grid and flex parents.
  长公式在网格与弹性容器中也只在自身区域滚动。
- GFM task boxes are legible in both themes; browsers ignore `accent-color` on disabled inputs.
  任务列表复选框在明暗主题下都清晰可辨。

### Compatibility / 兼容性

- Existing exports, props, class names, `--moe-*` variables, import paths and published releases keep working.
  既有导出、属性、类名、变量、导入路径与已发布版本继续可用。
- The 0.1 color primitives keep their exact values and carry DTCG `$deprecated`.
  0.1 原始色板变量保留原值，并带有 DTCG `$deprecated` 标记。

## 0.1.2 — 2026-09-07

### Added / 新增

- An opt-in `RichTextEditor` with visual editing, Markdown source and safe preview; portable formatting,
  controlled/uncontrolled state, form integration, undo/redo and source preservation for unsupported syntax.
  新增可选富文本编辑器，包含可视编辑、Markdown 源码、安全预览、受控/非受控状态、表单映射和撤销重做；不支持的语法保留源码。

- Real frosted-backdrop compositing over text and drawings, configurable blur/tint, and an interactive comparison.
  真正覆盖文字与绘图的毛玻璃，支持调节模糊/染色，并提供交互对照。
- Opt-in React and Astro Markdown/TeX renderers with GFM, MathML, sanitized URLs, code highlighting,
  bounded formula parsing and self-hosted KaTeX fonts.
  可选 React 与 Astro Markdown/TeX 渲染，支持 GFM、MathML、URL 清洗、高亮、公式预算和自托管字体。
- Refined bilingual site copy in the warm editorial workshop voice.
  双语展示文案统一为温暖、具体的编辑工坊风格。

- Warm glass panels, cards and action strips with three tints and opaque fallbacks.
  暖色玻璃面板、卡片与操作栏，三种色调与实色降级。
- Four finite entrance animations plus hover/press utilities; system reduced-motion wins.
  四种有限入场动效与悬浮/按压反馈，尊重系统减少动态偏好。
- Original gradient K SVG and extracted sparkle, static/CDN assets and accessible React `Icon`.
  原版渐变 K 与提取星芒，静态/CDN 资源及可访问 React 图标。
- React/Astro `CodeBlock`, explicit syntax highlighting, separate warm light/dark palettes,
  clipboard feedback and a self-hosted JetBrains Mono font in the docs.
  React/Astro 代码框、显式语法高亮、暖色明暗色板、复制反馈与文档自托管字体。
- Message avatars, statuses, surface variants, quotations, attachments, actions and finite typing indicators.
  消息头像、状态、表面变体、引用、附件、操作与有限输入指示动效。

### Compatibility / 兼容性

- Existing theme tokens, `BrandMark`, component props and layered CSS imports remain supported.
  既有主题令牌、品牌标记、组件属性与分层样式导入保持兼容。
- Unknown code languages and very large snippets fall back to escaped plain text.
  未知语言和大代码片段回退安全纯文本。
- `/v0.1.0/` and `/v0.1.1/` assets are immutable; only the new release and mutable aliases update.
  旧版本资源不变，只新增版本并更新可变别名。

### Verification and boundaries / 验证与边界

- The editor demo includes the Tiptap engine and live preview parsers, so its client chunk exceeds
  Vite's 500 kB warning threshold. It is an opt-in `client:visible` island and is not part of ordinary
  component imports; this is a deliberate feature cost, not a claim of lightweight editing.
  编辑器演示包含编辑核心与实时预览解析器，客户端包超过 Vite 的 500 kB 提示阈值；通过独立入口和
  `client:visible` 延迟加载隔离，不把此成本加到普通组件上。真实系统输入法仍需目标设备验收。

- Unit, NodeNext declaration, Astro, browser, formatting, lint, tarball and CDN/history checks.
  单元、类型声明、Astro、浏览器、格式、lint、打包与 CDN/历史检查。
- Chromium desktop and WebKit mobile cover both themes, keyboard navigation, overflow and reduced motion;
  forced-color emulation is Chromium-only. No claim of full WCAG certification or low-end GPU profiling.
  明暗、键盘、溢出与减少动态已覆盖；强制颜色仿真仅 Chromium 支持。不宣称完整 WCAG 认证或低端 GPU 性能结论。
- Local demo messages do not leave the browser. This repository does not automatically publish to npm.
  演示消息不离开浏览器；仓库不自动向 npm 发布。
