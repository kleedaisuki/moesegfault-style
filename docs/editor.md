# 一页可以带走的纸 / A page you can take with you

`RichTextEditor` 是输出 Markdown 的 React 富文本编辑器。它提供可视编辑、源码、预览三种视图；不是协同文档服务，也不会自行保存内容。

`RichTextEditor` is a React rich-text editor with Markdown as its public value. It offers visual, source, and preview views. It is not a collaborative document service and does not persist content.

## 最小接入 / Minimal integration

```tsx
import { useState } from "react";
import { RichTextEditor } from "@moesegfault/style/react/editor";
import "@moesegfault/style/all.css";

/** 应用持有 Markdown；按业务需要另行实现保存。 / The app owns Markdown; persistence is a separate concern. */
export function Note() {
  const [markdown, setMarkdown] = useState("## 新的一页 / A fresh page\n");
  return (
    <RichTextEditor
      label="随记 / Notes"
      name="body"
      value={markdown}
      onChange={setMarkdown}
      locale="zh"
    />
  );
}
```

非受控用法使用 `defaultValue`。不要在组件生命周期内切换受控与非受控模式。`name` 会生成携带 Markdown 的隐藏表单字段；`disabled` 时该字段不参与表单提交。

Use `defaultValue` for uncontrolled usage. Do not switch between controlled and uncontrolled modes during the component lifetime. `name` creates a hidden Markdown form field; disabled fields are excluded from submission.

Astro 中可导入同一 React 组件并添加 `client:visible` 或 `client:load`；服务端先显示只读内容，客户端接管后才能编辑。编辑器采用独立入口，普通展示组件无需加载编辑依赖。

In Astro, import the same React component with `client:visible` or `client:load`. Read-only content is rendered first on the server; editing becomes available after hydration. The separate entry keeps editor dependencies out of ordinary display components.

## 一份诚实的格式契约 / An explicit format contract

| 内容 / Content | 行为 / Behavior |
| --- | --- |
| 标题、粗体、斜体、删除线 / Headings, bold, italic, strikethrough | 可视编辑 / Visual editing |
| 列表、任务列表、引用 / Lists, tasks, blockquotes | 可视编辑 / Visual editing |
| 行内代码、代码块、普通表格 / Inline code, fenced code, basic tables | 可视编辑 / Visual editing |
| 链接 / Links | 仅接受安全协议 / Safe URL schemes only |
| TeX、图片、HTML、脚注、对齐表格及其他不支持的语法 / TeX, images, HTML, footnotes, aligned tables, and unsupported syntax | 源码保全，可切换安全预览 / Preserved in source mode with safe preview |

Markdown 是语义格式，不是富文本布局格式：没有字体选择、任意颜色、浮动排版或像素级页面布局。可视编辑会规范化标记和空白，因此语义往返不等于逐字节往返。仅初始化或切换视图不应改写原始 Markdown。

Markdown is a semantic format, not a page-layout format: no font picker, arbitrary colors, floating layout, or pixel-perfect pagination. Visual edits normalize markup and whitespace; semantic round-tripping is not byte-for-byte round-tripping. Initialization and view changes alone do not rewrite source Markdown.

公式在源码视图中使用 `$...$` 或 `$$...$$` 编写，在预览中渲染。不提供公式的可视化结构编辑。富 HTML 粘贴降为纯文本，外部拖放被禁用；该边界避免将不可表示的格式偷偷转换进文档。

Write formulas as `$...$` or `$$...$$` in source view and render them in preview. Visual structural math editing is not provided. Rich HTML paste becomes plain text and external drops are blocked, preventing silent import of unrepresentable formatting.

## 接入边界 / Integration boundaries

- **应用状态 / Application state**：`onChange(markdown)` 表达用户修改，不表示保存成功。持久化、网络错误、冲突处理及恢复由调用方实现。 / A change event means an edit, not a successful save. Persistence, network errors, conflict handling, and recovery belong to the host application.
- **只读与禁用 / Read-only and disabled**：`readOnly` 用于可阅读和复制但不可修改的内容；`disabled` 禁止修改并排除表单提交。两者都不是安全授权机制。 / Read-only content remains readable and copyable; disabled content cannot mutate or submit. Neither replaces authorization.
- **服务端校验 / Server validation**：Markdown 来自不可信输入。入库、长度限制、权限与输出清洗应在业务边界再次校验。 / Markdown is untrusted input. Enforce storage policy, length limits, authorization, and output sanitization at application boundaries.
- **无障碍 / Accessibility**：提供与内容用途相关的 `label`，保留键盘聚焦样式。保存或复制结果应使用不抢焦点的状态提示。 / Supply a meaningful label and retain keyboard focus styling. Announce save/copy results without moving focus.

状态提示参考 [W3C ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22.html)。编辑核心使用 [Tiptap Markdown](https://tiptap.dev/docs/editor/markdown)；其格式能力与渲染器并非完全相同，因此必须显式保护超出可视编辑子集的源码。

Status feedback follows [W3C ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22.html). The editing core uses [Tiptap Markdown](https://tiptap.dev/docs/editor/markdown); its format capabilities differ from the renderer, so source outside the visual-editing subset must be protected explicitly.
