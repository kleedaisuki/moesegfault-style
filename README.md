# MoeSegfault Style

> A warm, editorial design system for React, Astro, and the web. 这是一个从 MoeSegfault
> 现有产品中提炼、重新实现的设计系统与组件库。

[![CI](https://github.com/kleedaisuki/moesegfault-style/actions/workflows/ci.yml/badge.svg)](https://github.com/kleedaisuki/moesegfault-style/actions/workflows/ci.yml)
[![Pages](https://github.com/kleedaisuki/moesegfault-style/actions/workflows/pages.yml/badge.svg)](https://github.com/kleedaisuki/moesegfault-style/actions/workflows/pages.yml)

- 文档与 showcase（规范地址）：<https://style.moesegfault.dev>
- 包名：`@moesegfault/style`
- 许可证：[`GPL-3.0-or-later`](./LICENSE)
- 运行时：现代 ESM（ECMAScript Modules，仅 ESM），React 19+，Astro 原生组件

> [!IMPORTANT]
> `style.moesegfault.dev` 是唯一规范域名（canonical domain）。拼写相近的
> `style.moesgefault.dev` 不是本项目地址。

## 它解决什么问题

本仓库把颜色、排版、间距、圆角、阴影、主题行为和常用界面模式收敛为一个稳定的公共
API。React、Astro 和纯 HTML 消费方共享相同的设计令牌（Design Tokens）与 CSS，而不被
迫使共享同一种组件运行时。

设计原则：

1. **令牌是契约**：组件使用语义令牌，不散落复制品牌颜色。
2. **CSS 显式接入**：样式不会因为导入 JavaScript 而偷偷污染宿主应用。
3. **薄框架封装**：React 与 Astro 组件共享视觉语言，但保留各自自然的渲染模型。
4. **可访问性默认开启**：可见焦点、减少动态效果（reduced motion）、语义 HTML 和明暗主题
   是基础行为，而不是可选补丁。
5. **固定版本优先**：生产应用应锁定完整语义化版本（Semantic Versioning, SemVer）。

## 仓库结构

```text
packages/style/
  tokens/              # DTCG token source (single source of truth)
  src/                 # TypeScript, React, CSS, theme helpers
  astro/               # Native Astro components
  scripts/             # Token/code generation
  dist/                # Generated package output (not hand-edited)
pages/                  # Astro documentation + dogfooding showcase
scripts/build-cdn.mjs   # Versioned static distribution builder
.github/workflows/      # CI and GitHub Pages deployment
```

工作区故意从单包与稳定子路径开始，避免过早制造多个包之间的发布依赖图。公共边界由
`packages/style/package.json` 的 `exports` 字段定义；`src/internal` 或 `dist` 中未导出的路径
均不是 API。

## 快速开始

仓库尚未配置自动 npm 发布。在包进入 registry 前，可以使用 pnpm workspace、Git URL 或
打包后的 tarball 集成；正式发布后安装方式为：

```bash
pnpm add @moesegfault/style
```

### CSS 与 Design Tokens

完整默认样式：

```ts
import "@moesegfault/style/all.css";
```

需要精细控制时按层引入：

```ts
import "@moesegfault/style/tokens.css";
import "@moesegfault/style/foundation.css";
import "@moesegfault/style/components.css";
```

令牌同时提供 CSS Custom Properties（CSS 自定义属性）、普通 JSON、DTCG JSON 和类型安全的
TypeScript 访问方式：

```ts
import { tokenNames, tokens } from "@moesegfault/style";
import tokensJson from "@moesegfault/style/tokens.json";
```

CSS 变量使用 `--moe-` 命名空间。组件样式位于级联层（Cascade Layers）中，因此宿主应用
可以用未分层样式自然覆盖它们，而不需要堆叠 `!important`。

### React

React 入口需要宿主提供 React 19+；它被声明为可选对等依赖（optional peer dependency），因此
只使用 CSS 或 Astro 原生组件的项目不会被迫安装 React。React 应用请显式安装运行时：

```bash
pnpm add @moesegfault/style react react-dom
```

随后导入组件：

```tsx
import "@moesegfault/style/all.css";
import {
  BrandMark,
  Button,
  Card,
  Cluster,
  Container,
  Stack,
} from "@moesegfault/style/react";

export function Welcome() {
  return (
    <Container>
      <Stack>
        <BrandMark />
        <Card>
          <h1>Hello, MoeSegfault!</h1>
          <Cluster>
            <Button>Get started</Button>
            <Button variant="secondary">Documentation</Button>
          </Cluster>
        </Card>
      </Stack>
    </Container>
  );
}
```

组件 props 继承对应原生 HTML 属性；`ref`、键盘语义与事件继续遵循 React 约定。请以
文档站展示的 API 表和 TypeScript 声明为当前事实来源。

### Astro 原生组件

Astro 组件可以从聚合入口导入，也可以使用显式子路径：

```astro
---
import "@moesegfault/style/all.css";
import { BrandMark, Button, Card, Container, Stack } from "@moesegfault/style/astro";
// Equivalent explicit import:
// import Button from "@moesegfault/style/astro/Button.astro";
---

<Container>
  <Stack>
    <BrandMark />
    <Card>
      <h1>Hello from Astro</h1>
      <Button href="/docs/">Read the docs</Button>
    </Card>
  </Stack>
</Container>
```

原生 `.astro` 组件默认输出静态 HTML，不发送客户端 JavaScript。若宿主在 Astro 中组合本库
与自己的 React 交互组件，请安装 `@astrojs/react`，并按需要选择 `client:load`、
`client:idle` 或 `client:visible` 等 hydration directive（注水指令）：

```astro
---
import ThemeSwitcher from "../components/ThemeSwitcher.tsx";
---

<ThemeSwitcher client:idle />
```

### 主题

主题辅助函数可用于解析系统偏好、应用主题或生成防止首次绘制闪烁的引导脚本：

```ts
import {
  applyTheme,
  createThemeBootstrap,
  resolveTheme,
  type MoeTheme,
  type ThemePreference,
} from "@moesegfault/style";
```

主题契约使用文档所示的 `data-*` 属性和语义令牌。不要让业务组件直接依赖原始颜色色阶；
这样主题改变时无需重写组件。

## 公共 API

| 入口 | 用途 |
| --- | --- |
| `@moesegfault/style` | 令牌常量、令牌名称、主题辅助函数与类型 |
| `@moesegfault/style/react` | React 组件与布局 primitive（基础构件） |
| `@moesegfault/style/astro` | Astro 原生组件聚合入口 |
| `@moesegfault/style/astro/*.astro` | 稳定的 Astro 组件显式子路径 |
| `@moesegfault/style/tokens.css` | CSS token definitions only |
| `@moesegfault/style/foundation.css` | 基础排版、主题与页面基础规则 |
| `@moesegfault/style/components.css` | 组件与布局样式 |
| `@moesegfault/style/all.css` | 上述 CSS 的便利聚合入口 |
| `@moesegfault/style/tokens.json` | 解析后的运行时令牌 JSON |
| `@moesegfault/style/tokens.dtcg.json` | DTCG 交换格式令牌 |

## 远程静态资源

GitHub Pages 同时承载便于普通 HTML 或无法安装 npm 包的消费方使用的静态资源。推荐锁定
完整版本：

```html
<link
  rel="stylesheet"
  href="https://style.moesegfault.dev/v0.1.1/css/all.css"
/>
```

版本索引与每版 manifest（清单）会描述实际可用文件。路径契约为：

```text
https://style.moesegfault.dev/manifest.json
https://style.moesegfault.dev/v<exact-semver>/manifest.json
https://style.moesegfault.dev/v<exact-semver>/...
https://style.moesegfault.dev/latest/...
https://style.moesegfault.dev/colors
https://style.moesegfault.dev/colors/colors.css
https://style.moesegfault.dev/colors/colors.json
https://style.moesegfault.dev/css/all.css
```

- `/v<exact-semver>/` 是不可变发布契约：已发布文件不得被覆盖。
- 每个精确版本都会保留并列入根 `manifest.json` 的 `publishedVersions`；不会生成 `/v0/`
  一类主版本浮动别名。
- `/latest/` 是唯一的完整浮动别名，只适合文档、原型或明确接受版本漂移的场景。
- `/colors` 是可导航的默认入口，并跳转到当前稳定版本（当前为 `/v0.1.1/colors/`）。
  `/colors/colors.css`、`/colors/colors.json` 与 `/css/all.css` 是无需跳转的最新稳定机器资源；
  如需可复现构建，请改用对应的 `/v0.1.1/...` 路径。
- React/Astro 组件默认通过包管理器消费；远程分发重点是 CSS 与 token JSON，避免浏览器裸
  ESM 的 React runtime 解析与重复实例问题。

### 这不是“强 CDN”

GitHub Pages 在这里是 **CDN-like 静态源站**，而不是带缓存控制、失效 API、服务等级协议
（Service-Level Agreement, SLA）或强一致性的专业 CDN。项目无法为 Pages 响应配置理想的
长期 `immutable` 缓存头；可变别名也可能短时间返回旧内容。对缓存策略、吞吐量或全球一致性
有严格要求的生产系统，应使用精确版本 URL，并在需要时把同一 URL 契约迁移到对象存储与
专业 CDN。

## 视觉来源与提取边界

视觉语言来自以下本地项目的共同模式，经归纳、令牌化和重新实现，而不是把应用代码直接
拼接成库：

| 来源 | 提取的设计语言 | 明确保留在应用侧的内容 |
| --- | --- | --- |
| `kleedaisuki.github.io` | 编辑部式排版、内容卡片、暖色主题、导航与文章展示 | 文章/PDF、站点内容、数据加载逻辑 |
| `kleedaisuki` | Hero、Bento 风格展示、项目/联系卡片、明暗主题 | 个人资料、GitHub 数据和页面业务逻辑 |
| `FOGMOE-telegram-bot/app` | 奶油与珊瑚色板、玻璃表面、状态与聊天视觉、移动端安全区 | 会话状态机、SSE/API、领域模型、完整聊天容器 |

本仓库只提取可泛化的视觉规范、交互语义和基础构件。**没有复制或重新分发源项目中的
PDF、文章或其他受内容许可证约束的正文。字体文件目前也不随库或远程静态资源分发**；默认
字体栈使用宿主系统字体。若未来新增字体或第三方图像，每项资产必须单独记录来源与许可证。

## 版本策略

项目遵循 SemVer：

- **patch**：不改变公共契约的修复与视觉微调；
- **minor**：向后兼容的新组件、variant 或 token；
- **major**：删除/重命名公共 export、组件 prop、CSS 变量、稳定选择器或改变核心行为。

`0.x` 阶段 API 仍在形成，破坏性改变可随 minor 版本发生，但必须在变更记录中明确说明。
进入 `1.0.0` 后严格遵循上述兼容规则。npm 包版本、精确 CDN 目录和 manifest 版本必须一致。

当前没有 npm 发布 workflow：scope 所有权、registry 授权和可信发布（Trusted Publishing）
配置确认之前，不会在 CI 中假设发布权限。

## 本地开发

要求 Node.js 24+ 与仓库 `packageManager` 字段指定的 pnpm 版本：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

常用验证：

```bash
pnpm build
pnpm test
pnpm lint
pnpm format:check
pnpm pack:check
pnpm test:e2e
```

`pnpm dev` 启动文档与 showcase。文档站直接使用 workspace library（dogfooding，自我验证），
因此示例不是一套与真实包分离的“假组件”。更多协作说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

代码与本仓库原创设计资产以 GNU General Public License v3.0 or later
（`GPL-3.0-or-later`）授权，完整条款见 [LICENSE](./LICENSE)。来源项目和第三方资产可能适用
不同许可证；本许可证不会自动改变它们的权利归属。提交第三方材料前，请先确认兼容性并在
提交中保留归属与许可证信息。
