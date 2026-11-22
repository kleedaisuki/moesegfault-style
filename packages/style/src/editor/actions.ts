import type { Editor } from "@tiptap/react";
import type { IconGlyph } from "../glyphs.js";

/** 工具栏动作契约。Toolbar action contract. */
interface Action {
  /** 双语名称。Bilingual name. */
  label: [string, string];
  /** 工具图标。Tool icon. */
  icon: IconGlyph;
  /** 活动标记或节点。Active mark or node. */
  active?: string;
  /** 仅通过受保护入口执行。Executed only through the guarded entry point. */
  run: (editor: Editor) => void;
}
/** 可序列化为 Markdown 的格式工具，不提供字体或颜色等不可移植格式。Portable formatting only, no font/color marks. */
export const actions: Action[] = [
  {
    label: ["粗体", "Bold"],
    icon: "bold",
    active: "bold",
    run: (e) => {
      e.chain().focus().toggleBold().run();
    },
  },
  {
    label: ["斜体", "Italic"],
    icon: "italic",
    active: "italic",
    run: (e) => {
      e.chain().focus().toggleItalic().run();
    },
  },
  {
    label: ["删除线", "Strikethrough"],
    icon: "strike",
    active: "strike",
    run: (e) => {
      e.chain().focus().toggleStrike().run();
    },
  },
  {
    label: ["二级标题", "Heading 2"],
    icon: "heading",
    active: "heading",
    run: (e) => {
      e.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    label: ["无序列表", "Bullet list"],
    icon: "list",
    active: "bulletList",
    run: (e) => {
      e.chain().focus().toggleBulletList().run();
    },
  },
  {
    label: ["有序列表", "Ordered list"],
    icon: "list-ordered",
    active: "orderedList",
    run: (e) => {
      e.chain().focus().toggleOrderedList().run();
    },
  },
  {
    label: ["任务列表", "Task list"],
    icon: "list-task",
    active: "taskList",
    run: (e) => {
      e.chain().focus().toggleTaskList().run();
    },
  },
  {
    label: ["引用", "Blockquote"],
    icon: "quote",
    active: "blockquote",
    run: (e) => {
      e.chain().focus().toggleBlockquote().run();
    },
  },
  {
    label: ["行内代码", "Inline code"],
    icon: "code",
    active: "code",
    run: (e) => {
      e.chain().focus().toggleCode().run();
    },
  },
  {
    label: ["代码块", "Code block"],
    icon: "code-block",
    active: "codeBlock",
    run: (e) => {
      e.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    label: ["插入表格", "Insert table"],
    icon: "table",
    run: (e) => {
      e.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
    },
  },
  {
    label: ["撤销", "Undo"],
    icon: "undo",
    run: (e) => {
      e.chain().focus().undo().run();
    },
  },
  {
    label: ["重做", "Redo"],
    icon: "redo",
    run: (e) => {
      e.chain().focus().redo().run();
    },
  },
];
