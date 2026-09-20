# Changelog / 更新记录

## Unreleased / 未发布

### Added / 新增

- Added the `moesegfault-style` Agent Skill with deterministic ZIP, manifest, and checksum downloads.
  新增 `moesegfault-style` Agent Skill，并提供可复现 ZIP、清单与校验和下载。

### Changed / 变更

- Migrated the documentation and static distribution origin from GitHub Pages to Cloudflare Workers Static Assets,
  preserving the canonical host and public URL contracts. CI now gates deployment on browser/visual tests and a
  Wrangler dry-run.
  文档与静态分发源站从 GitHub Pages 迁移到 Cloudflare Workers Static Assets，规范域名与公开 URL
  契约保持不变；CI 新增浏览器/视觉回归与 Wrangler dry-run 部署门禁。

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
