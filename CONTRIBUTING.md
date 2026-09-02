# Contributing

感谢你帮助改进 MoeSegfault Style。提交变更即表示你有权按本仓库的
[`GPL-3.0-or-later`](./LICENSE) 许可证贡献相关内容。

## 开发环境

- Node.js 24 或更高版本
- 由根目录 `package.json#packageManager` 固定的 pnpm 版本

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

不要手工编辑生成文件。设计令牌（Design Tokens）以 DTCG 源文件为单一事实来源，由构建
脚本生成 CSS、JSON 和 TypeScript 输出。

## 变更边界

1. 先确认问题属于 token、基础 CSS、React、Astro、文档或分发中的哪一层。
2. 优先修正数据结构或公共抽象，使特殊情况成为普通情况；不要持续叠加条件分支。
3. React 与 Astro 应共享语义和样式，但不必为了“复用”制造不自然的跨运行时包装。
4. 公共 export、组件 props、`--moe-*` CSS 变量和固定版本 CDN 路径都是兼容性 API。
5. 文档示例必须从 `@moesegfault/style` workspace 包导入，不能复制组件实现。
6. 不要提交 PDF、文章、字体或来源不清晰的第三方资产。新增第三方材料必须记录出处、作者和
   许可证。

## 验证

根据变更的真实风险运行最小但充分的检查，并在 pull request 中说明结果：

```bash
pnpm build
pnpm test
pnpm lint
pnpm format:check
```

其他按需检查：

```bash
pnpm pack:check  # package exports and tarball contents
pnpm test:e2e    # rendered documentation/user journeys
```

视觉变更至少检查浅色/深色、键盘焦点、窄屏和 `prefers-reduced-motion`。测试应复现真实失败
模式，而不是只为增加测试数量。

## Pull request

请保持每个 pull request 目标单一，并包含：

- 问题与用户影响；
- 设计或 API 取舍；
- 兼容性影响和迁移方法；
- 实际执行的验证；
- 视觉变更的前后截图（如适用）；
- 第三方来源和许可证（如适用）。

提交信息建议使用祈使语气，例如 `Add Astro card primitive`。不要把格式化整个仓库或无关
重构混入功能提交。

## 发布说明

维护者负责版本号、changelog、不可变 `/v/<exact-semver>/` 资产和 GitHub Pages 发布。
当前没有 npm 自动发布流程；在 scope、registry 权限和 Trusted Publishing（可信发布）设置
确认前，请勿提交包含长期 npm token 的 workflow。

